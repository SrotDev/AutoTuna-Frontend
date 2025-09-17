document.addEventListener('DOMContentLoaded', () => {
    feather.replace();

    let messagePollingInterval = null;
    let agentStartPollingInterval = null;
    let notificationPollingInterval = null;
    let isAutoReplyEnabled = false;
    let updateAgentUI = () => { };
    let pollForAgentStart = () => { };

    // =================================================
    // --- 2. ALL BACKEND & HELPER FUNCTIONS ---
    // =================================================

    function startMessagePolling(messageList) {
        stopMessagePolling();
        messagePollingInterval = setInterval(() => {
            const activeTab = document.querySelector('.message-tabs .tab-btn.active');
            const category = activeTab ? activeTab.dataset.category : 'important';
            handleFetchMessages(category, messageList);
        }, 20000);
    }

    function stopMessagePolling() {
        if (messagePollingInterval) clearInterval(messagePollingInterval);
        messagePollingInterval = null;
    }

    function startNotificationPolling() {
        stopNotificationPolling();
        console.log("Starting notification polling (checking every 30 seconds)...");
        handleFetchNotifications();
        notificationPollingInterval = setInterval(() => handleFetchNotifications(), 30000);
    }

    function stopNotificationPolling() {
        if (notificationPollingInterval) {
            console.log("Stopping notification polling.");
            clearInterval(notificationPollingInterval);
            notificationPollingInterval = null;
        }
    }
    // In script.js


    function parseJwt(token) {
        if (!token) return null;
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
            return JSON.parse(jsonPayload);
        } catch (e) {
            console.error("Failed to parse JWT token:", e);
            return null;
        }
    }

    function createNotificationHTML(notification) {
        const isUnread = !notification.read;
        const icon = isUnread ? 'bell' : 'check-circle';
        return `
        <div class="notification-item ${isUnread ? 'unread' : ''}" data-id="${notification.id}">
            <div class="notification-icon"><i data-feather="${icon}"></i></div>
            <div class="notification-content">
                <span class="title">${notification.title || 'Notification'}</span>
                <p class="body">${notification.body || ''}</p>
                <span class="time">${new Date(notification.timestamp).toLocaleString()}</span>
            </div>
            <div class="notification-item-actions">
                ${isUnread ? `<button class="btn-action btn-mark-read" title="Mark as Read"><i data-feather="check"></i></button>` : ''}
                <button class="btn-action btn-delete" title="Delete"><i data-feather="trash-2"></i></button>
            </div>
        </div>`;
    }

    function createHistoryCardHTML(msg) {
        const sentimentClass = msg.sentiment ? `sentiment-${msg.sentiment.toLowerCase()}` : 'sentiment-neutral';
        return `
        <div class="message-card history-card glass-card ${sentimentClass}" data-message-id="${msg.id}">
            <div class="message-card-header">
                <div class="message-sender"><i data-feather="user"></i><span>${msg.contact_username || 'Unknown'}</span></div>
                <div class="message-timestamp">${new Date(msg.timestamp).toLocaleString()}</div>
            </div>
            <p class="message-content"><strong>Original:</strong> ${msg.message}</p>
            <div class="ai-reply-section">
                <div class="ai-reply-header">
                    <h4>Your Reply</h4>
                    <span class="sentiment-tag">Score: ${msg.score !== null ? msg.score : 'N/A'}</span>
                </div>
                <div class="ai-reply-body"><p>${msg.reply_message || 'No reply found.'}</p></div>
            </div>
        </div>`;
    }

    function createInteractiveMessageCardHTML(msg) {
        const sentimentClass = msg.sentiment ? `sentiment-${msg.sentiment.toLowerCase()}` : 'sentiment-neutral';
        const hasAiReply = msg.reply_message && msg.reply_message.trim() !== '';
        const aiReplyBlock = `
        <div class="ai-reply-header">
            <i data-feather="cpu"></i><h4>AI Analysis</h4>
            ${msg.sentiment ? `<span class="sentiment-tag">${msg.sentiment}</span>` : ''}
        </div>
        <div class="ai-reply-body">
            ${hasAiReply ? `<p>${msg.reply_message}</p>` : `
                <div class="no-reply-message"><i data-feather="info"></i><span>AI could not generate a reply for this message.</span></div>`}
        </div>`;
        const interactionBlock = `
        <div class="interaction-area">
            ${hasAiReply ? `
                <div class="interaction-header">Edit & Rate AI Reply</div>
                <textarea class="edit-reply-textarea" placeholder="Edit the AI reply here...">${msg.reply_message}</textarea>
                <div class="rating-input-group">
                    <label for="score-${msg.id}">Rate Accuracy (0-100):</label>
                    <input type="number" id="score-${msg.id}" class="score-input" min="0" max="100" value="100">
                </div>` : `
                <div class="interaction-header">Write Your Own Reply</div>
                <textarea class="edit-reply-textarea" placeholder="Type your reply here..."></textarea>`}
            <button class="btn btn-primary btn-approve-send"><i data-feather="send"></i> Send Reply</button>
        </div>`;
        return `
        <div class="message-card glass-card ${sentimentClass}" data-message-id="${msg.id}">
            <div class="message-card-header">
                <div class="message-sender"><i data-feather="user"></i><span>${msg.contact_username || 'Unknown'}</span></div>
                <div class="message-timestamp">${new Date(msg.timestamp).toLocaleString()}</div>
            </div>
            <p class="message-content">${msg.message}</p>
            <div class="ai-reply-section">${aiReplyBlock}${interactionBlock}</div>
        </div>`;
    }
    /**
     * Fetches only the auto-reply status from the backend.
     * @returns {Promise<boolean>} The current auto-reply status (true/false). Defaults to false on error.
     */
    async function fetchAutoReplyStatus() {
        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) return false; // Default to false if not logged in

        try {
            const response = await fetch('https://emotuna-backend-production.up.railway.app/api/agent_status/', {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            if (response.ok) {
                const data = await response.json();
                // Return the specific boolean value
                return data.agent_auto_reply === true;
            }
            // If the request fails for any reason, assume auto-reply is off.
            return false;
        } catch (error) {
            console.error("Error fetching auto-reply status:", error);
            return false;
        }
    }
    /**
 * Fetches the running status of the agent for the current user.
 * This correctly includes the username as a query parameter.
 * @returns {Promise<boolean>} True if the agent is running, otherwise false.
 *//**
                                  * Fetches the COMPLETE status object of the agent for the current user.
                                  * @returns {Promise<object|null>} The full status object (e.g., {is_running: false, pin_required: true}) 
                                  *                                 on success, or null on failure.
                                  */
    async function checkAgentStatus() {
        const accessToken = localStorage.getItem('accessToken');
        const username = localStorage.getItem('username');

        if (!accessToken || !username) {
            return null; // Return null if we can't make a request
        }

        try {
            const response = await fetch(`https://emotuna-backend-production.up.railway.app/api/userbot/?username=${username}`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });

            if (response.ok) {
                const result = await response.json();
                // --- THIS IS THE FIX ---
                // Return the entire result object, not just a boolean.
                return result;
            }

            // If the response is not OK (e.g., 404), it means there's no agent status.
            return null;

        } catch (error) {
            console.error("Error fetching agent status:", error);
            return null; // Return null on network errors
        }
    }
    // In script.js, add this new function

    /**
     * Checks the user's Telegram credentials to see if a PIN is required.
     * This function queries the correct endpoint for this specific status.
     * @returns {Promise<boolean>} True if a PIN is required, otherwise false.
     */
    async function checkTelegramPinRequirement() {
        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) return false;

        try {
            // --- THIS IS THE CRITICAL CHANGE ---
            // Query the /api/telegram/ endpoint, not /api/userbot/
            const response = await fetch('https://emotuna-backend-production.up.railway.app/api/telegram/', {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });

            if (response.ok) {
                const data = await response.json();
                console.log("Response from /api/telegram/ for PIN check:", data);

                // Check if the pin_required property is explicitly true
                return data.pin_required === true;
            }

            // If the request fails for any reason, assume no PIN is needed.
            return false;

        } catch (error) {
            console.error("Error checking Telegram PIN requirement:", error);
            return false;
        }
    }
    async function checkPinRequirement() {
        const agentStatus = await checkAgentStatus();

        // --- DIAGNOSTIC LOG ---
        // Let's see the exact object we receive from the backend.
        console.log("Status object received in checkPinRequirement:", agentStatus);

        return agentStatus ? agentStatus.pin_required === true : false;
    }

    async function handleRegisterUser(formElement) {
        const submitButton = formElement.querySelector('button');
        const originalButtonText = submitButton.textContent;
        const formData = new FormData(formElement);
        const userData = Object.fromEntries(formData.entries());
        submitButton.disabled = true;
        submitButton.textContent = 'Creating Account...';
        try {
            const response = await fetch('https://emotuna-backend-production.up.railway.app/api/register/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });
            const result = await response.json();
            if (response.ok) {
                localStorage.setItem('accessToken', result.access);
                localStorage.setItem('refreshToken', result.refresh);
                localStorage.setItem('username', result.username);
                return result;
            } else {
                alert(`Registration failed: ${result.detail || JSON.stringify(result)}`);
                return null;
            }
        } catch (error) {
            alert("An error occurred during registration.");
            return null;
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }
    }

    async function handleUserLogin(formElement) {
        const submitButton = formElement.querySelector('button');
        const originalButtonText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = 'Logging In...';
        try {
            const formData = new FormData(formElement);
            const loginData = Object.fromEntries(formData.entries());
            const response = await fetch('https://emotuna-backend-production.up.railway.app/api/login/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(loginData)
            });
            const result = await response.json();
            if (response.ok) {
                const accessToken = result.access;
                const tokenPayload = parseJwt(accessToken);
                const userId = tokenPayload ? tokenPayload.user_id : null;
                if (userId) {
                    localStorage.setItem('accessToken', accessToken);
                    localStorage.setItem('refreshToken', result.refresh);
                    localStorage.setItem('username', result.username);
                    localStorage.setItem('userId', userId);
                    localStorage.setItem('isFullyOnboarded', result.is_onboarded === true);
                    initializeApp();
                } else {
                    throw new Error("Could not extract user ID from authentication token.");
                }
            } else {
                alert(`Login failed: ${result.detail || JSON.stringify(result)}`);
            }
        } catch (error) {
            alert(`Login failed: ${error.message}`);
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }
    }

    async function handleSendTelegramDetails(formElement) {
        const submitButton = formElement.querySelector('button');
        const originalButtonText = submitButton.textContent;
        const accessToken = localStorage.getItem('accessToken');
        const username = localStorage.getItem('username');
        if (!accessToken || !username) return false;
        const formData = new FormData(formElement);
        const telegramData = Object.fromEntries(formData.entries());
        telegramData.username = username;
        submitButton.disabled = true;
        submitButton.textContent = 'Connecting...';
        try {
            const response = await fetch('https://emotuna-backend-production.up.railway.app/api/telegram/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
                body: JSON.stringify(telegramData)
            });
            if (response.ok) {
                localStorage.setItem('isFullyOnboarded', 'true');
                return true;
            } else {
                const result = await response.json();
                alert(`Failed to connect: ${result.detail || JSON.stringify(result)}`);
                return false;
            }
        } catch (error) {
            alert('Could not connect to the server.');
            return false;
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }
    }

    /**
 * Verifies the PIN code with the backend.
 * This is a robust function that checks both the HTTP status and the response body.
 * @returns {Promise<boolean>} Explicitly returns true on success and false on any failure.
 */
    async function handleVerifyPinCode(formElement) {
        const submitButton = formElement.querySelector('button'); // Assuming a button exists inside the form
        const originalButtonText = submitButton ? submitButton.textContent : 'Verify';
        const accessToken = localStorage.getItem('accessToken');
        const username = localStorage.getItem('username');

        if (!accessToken || !username) return false;

        const formData = new FormData(formElement);
        const pinData = Object.fromEntries(formData.entries());
        pinData.username = username;

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'Verifying...';
        }

        try {
            const response = await fetch('https://emotuna-backend-production.up.railway.app/api/telegram/', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
                body: JSON.stringify(pinData)
            });

            // --- THIS IS THE ROBUST FIX ---

            // Step 1: Handle clear, non-OK server errors first.
            if (!response.ok) {
                const errorResult = await response.json();

                return false; // Explicitly return false
            }

            // Step 2: If the status is OK, we still need to check the body for success.
            // This defends against the "200 OK but failed" scenario.
            const result = await response.json();

            // Let's assume the backend sends something like { "status": "success" } or { "verified": true }
            // We will check for a positive confirmation. Adjust 'verified' if your backend uses a different key.
            if (result.verified === true || result.status === 'success') {
                return true; // Explicitly return true on success
            } else {
                // This is the silent failure case: 200 OK but the PIN was wrong.

                return false; // Explicitly return false
            }

        } catch (error) {
            alert('Could not connect for PIN verification.');
            return false; // Explicitly return false on network errors
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
            }
        }
    }

    async function setPinRequiredStatus(isRequired) {
        const accessToken = localStorage.getItem('accessToken');
        const username = localStorage.getItem('username');
        if (!accessToken || !username) return false;
        try {
            const response = await fetch('https://emotuna-backend-production.up.railway.app/api/telegram/', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
                body: JSON.stringify({ username: username, pin_required: isRequired })
            });
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    async function sendStartCommand(modelChoice) {
        const accessToken = localStorage.getItem('accessToken');
        const username = localStorage.getItem('username');
        if (!accessToken || !username) {
            alert('Authentication error.');
            return false;
        }
        const requestData = { username: username, model_choice: modelChoice };
        try {
            const response = await fetch('https://emotuna-backend-production.up.railway.app/api/userbot/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
                body: JSON.stringify(requestData)
            });
            if (response.ok) return true;
            const error = await response.json();
            throw new Error(error.detail || JSON.stringify(error));
        } catch (error) {
            alert(`Failed to send start command: ${error.message}`);
            return false;
        }
    }

    async function handleStopAgent(buttonElement) {
        const originalButtonContent = buttonElement.innerHTML;
        buttonElement.disabled = true;
        buttonElement.innerHTML = `<i data-feather="loader" class="spin"></i> Stopping...`;
        feather.replace();
        const accessToken = localStorage.getItem('accessToken');
        const username = localStorage.getItem('username');
        if (!accessToken || !username) return false;
        try {
            const response = await fetch('https://emotuna-backend-production.up.railway.app/api/userbot/', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
                body: JSON.stringify({ username: username })
            });
            if (response.ok) {
                const result = await response.json();
                alert(`Agent status: ${result.status}`);
                localStorage.setItem('agentIsRunning', 'false');
                return true;
            } else {
                const errorResult = await response.json();
                throw new Error(`Failed to stop agent: ${JSON.stringify(errorResult)}`);
            }
        } catch (error) {
            alert(error.message);
            return false;
        } finally {
            buttonElement.disabled = false;
            buttonElement.innerHTML = originalButtonContent;
            feather.replace();
        }
    }

    async function handleFetchUserProfile() {
        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) return null;
        try {
            const response = await fetch('https://emotuna-backend-production.up.railway.app/api/profile/', {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            if (response.ok) return await response.json();
            return null;
        } catch (error) {
            console.error("Failed to fetch user profile:", error);
            return null;
        }
    }

    async function handleUpdateUserProfile(dataToUpdate) {
        const accessToken = localStorage.getItem('accessToken');
        const userId = localStorage.getItem('userId');
        if (!accessToken || !userId) {
            alert("Authentication error or user ID is missing. Please log in again.");
            return false;
        }
        try {
            const response = await fetch(`https://emotuna-backend-production.up.railway.app/api/profiles/${userId}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
                body: JSON.stringify(dataToUpdate)
            });
            if (response.ok) {
                alert("Profile updated successfully!");
                return true;
            } else {
                const errorData = await response.json();
                alert(`Update failed: ${Object.values(errorData).flat().join('\n')}`);
                return false;
            }
        } catch (error) {
            alert("An error occurred while updating your profile.");
            return false;
        }
    }

    /**
 * Updates the user's auto-reply status on the backend.
 * @param {boolean} isEnabled - The new status for auto-reply.
 * @returns {Promise<boolean>} True if the update was successful, otherwise false.
 */
    async function handleUpdateAutoReplyStatus(isEnabled) {
        console.log(`Sending PATCH request to set auto-reply to: ${isEnabled}`);
        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) {
            alert("Authentication error.");
            return false;
        }

        try {
            const response = await fetch('https://emotuna-backend-production.up.railway.app/api/agent_status/', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                // --- THIS IS THE FIX ---
                // Use the 'isEnabled' variable, not a hardcoded 'true'.
                body: JSON.stringify({ agent_auto_reply: isEnabled })
            });

            if (!response.ok) {
                console.error("Failed to update auto-reply status on the backend.");
                alert("Could not save the auto-reply setting. Please try again.");
                return false;
            }

            console.log("Auto-reply status updated successfully on the backend.");
            return true;

        } catch (error) {
            console.error("Network error while updating auto-reply status:", error);
            alert("Could not connect to the server to save the setting.");
            return false;
        }
    }

    async function handleFetchMessages(category, messageListElement) {
        if (!messageListElement) return;
        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) return;
        if (!window.notifiedMessageIds) window.notifiedMessageIds = new Set();
        const apiQuery = 'reply_sent=false';
        if (messageListElement.children.length === 0) {
            messageListElement.innerHTML = `<p class="loading-state">Fetching messages...</p>`;
        }
        try {
            const response = await fetch(`https://emotuna-backend-production.up.railway.app/api/messages/?${apiQuery}`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            if (!response.ok) throw new Error(`Server responded with status: ${response.status}`);
            const allMessages = await response.json();
            let filteredMessages;
            if (category === 'important') filteredMessages = allMessages.filter(m => m.is_important);
            else if (category === 'offensive') filteredMessages = allMessages.filter(m => m.is_toxic);
            else if (category === 'general') filteredMessages = allMessages.filter(m => !m.is_important && !m.is_toxic);
            else filteredMessages = allMessages;

            const existingMessageIds = new Set([...messageListElement.querySelectorAll('.message-card')].map(c => c.dataset.messageId));
            const incomingMessageIds = new Set(filteredMessages.map(m => String(m.id)));
            let newMessagesFound = false;

            existingMessageIds.forEach(id => {
                if (!incomingMessageIds.has(id)) {
                    const cardToRemove = messageListElement.querySelector(`[data-message-id="${id}"]`);
                    if (cardToRemove) {
                        cardToRemove.style.opacity = '0';
                        setTimeout(() => cardToRemove.remove(), 300);
                    }
                }
            });

            filteredMessages.forEach(msg => {
                if (!existingMessageIds.has(String(msg.id))) {
                    newMessagesFound = true;
                    const formattedMessage = {
                        id: msg.id,
                        contact_username: msg.contact_username || 'Unknown',
                        timestamp: msg.timestamp,
                        message: msg.message,
                        sentiment: msg.sentiment,
                        reply_message: msg.ai_generated_message,
                        is_toxic: msg.is_toxic,
                        score: msg.score
                    };
                    const cardHtml = createInteractiveMessageCardHTML(formattedMessage);
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = cardHtml;
                    const newCard = tempDiv.firstElementChild;
                    newCard.style.opacity = '0';
                    messageListElement.appendChild(newCard);
                    setTimeout(() => { newCard.style.opacity = '1'; }, 50);
                }
            });

            if (newMessagesFound) {
                const newestMessageId = filteredMessages.length > 0 ? filteredMessages[0].id : null;
                if (newestMessageId && !window.notifiedMessageIds.has(newestMessageId)) {
                    await createNotification("New Message Received", `You have new messages in the '${category}' category.`);
                    window.notifiedMessageIds.add(newestMessageId);
                }
            }
            if (messageListElement.querySelector('.loading-state')) messageListElement.innerHTML = '';
            if (messageListElement.children.length === 0) {
                messageListElement.innerHTML = `<p class="empty-state">No pending messages in this category.</p>`;
            }
            feather.replace();
        } catch (error) {
            console.error("Error fetching messages:", error);
            messageListElement.innerHTML = `<p class="error-state">Could not load messages.</p>`;
        }
    }

    async function handleFetchHistory() {
        const listElement = document.getElementById('history-list');
        if (!listElement) return;

        listElement.innerHTML = `<p class="loading-state">Loading history...</p>`;

        try {
            const accessToken = localStorage.getItem('accessToken');
            if (!accessToken) throw new Error("Authentication error.");


            const response = await fetch(`https://emotuna-backend-production.up.railway.app/api/messages/?reply_sent=true`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });

            if (!response.ok) throw new Error(`Server responded with status ${response.status}`);

            const historyMessages = await response.json();

            listElement.innerHTML = ''; // Clear loading state

            if (historyMessages && historyMessages.length > 0) {
                historyMessages.forEach(msg => {
                    const cardHtml = createHistoryCardHTML(msg);
                    listElement.insertAdjacentHTML('beforeend', cardHtml);
                });
            } else {
                listElement.innerHTML = `<p class="empty-state">No sent messages found.</p>`;
            }

            feather.replace();

        } catch (error) {
            console.error("Error fetching history:", error);
            listElement.innerHTML = `<p class="error-state">Could not load history.</p>`;
        }
    }
    async function handleApproveAndSend(messageId, messageCard) {
        const approveBtn = messageCard.querySelector('.btn-approve-send');
        if (!approveBtn) return false;

        approveBtn.disabled = true;
        approveBtn.innerHTML = `<i data-feather="loader" class="spin"></i> Sending...`;
        feather.replace();

        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) {
            alert("Authentication error.");
            // Restore button on failure
            approveBtn.disabled = false;
            approveBtn.innerHTML = `<i data-feather="send"></i> Send Reply`;
            feather.replace();
            return false;
        }

        // --- THIS IS THE CRITICAL FIX ---

        // 1. Get the user's final reply from the textarea. This is ALWAYS present.
        const finalReplyInput = messageCard.querySelector('.edit-reply-textarea');
        const finalReply = finalReplyInput ? finalReplyInput.value.trim() : '';

        // If the user is sending an empty message, stop them.
        if (finalReply === '') {
            alert("Cannot send an empty reply.");
            approveBtn.disabled = false;
            approveBtn.innerHTML = `<i data-feather="send"></i> Send Reply`;
            feather.replace();
            return false;
        }

        // 2. Get the score. If the score input doesn't exist (because there was no AI reply), default to 100.
        const scoreInput = messageCard.querySelector('.score-input');
        const score = scoreInput ? parseInt(scoreInput.value, 10) : 100;

        // 3. Prepare the data to send to the backend.
        const dataToSend = {
            reply_message: finalReply,
            score: score,
            user_approved_reply: true,
            replied: true
        };

        try {
            const response = await fetch(`https://emotuna-backend-production.up.railway.app/api/messages/${messageId}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
                body: JSON.stringify(dataToSend)
            });

            if (response.ok) {
                return true; // Success! The calling function will handle removing the card.
            } else {
                const error = await response.json();
                throw new Error(JSON.stringify(error));
            }
        } catch (error) {
            alert(`Failed to send approval: ${error.message}`);
            // Restore the button on failure
            approveBtn.disabled = false;
            approveBtn.innerHTML = `<i data-feather="send"></i> Send Reply`;
            feather.replace();
            return false;
        }
    }
    async function handleUploadData(file, buttonElement) {
        if (!file) {
            console.error("No file selected for upload.");
            return;
        }

        const originalButtonContent = buttonElement.innerHTML;
        buttonElement.disabled = true;
        buttonElement.innerHTML = `<i data-feather="loader" class="spin"></i> Uploading...`;
        feather.replace();

        const accessToken = localStorage.getItem('accessToken');
        const username = localStorage.getItem('username');
        if (!accessToken || !username) {
            alert('Authentication error. Please log in again.');
            // Restore button before exiting
            buttonElement.disabled = false;
            buttonElement.innerHTML = originalButtonContent;
            feather.replace();
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('username', username);

        try {
            const response = await fetch('https://emotuna-backend-production.up.railway.app/api/dataset/', {
                method: 'POST',
                headers: {
                    // NOTE: Do NOT set 'Content-Type' for FormData, the browser does it.
                    'Authorization': `Bearer ${accessToken}`
                },
                body: formData
            });

            if (response.ok) {
                // Now we can provide a more informative success message.
                try {
                    const result = await response.json();
                    alert(`File uploaded successfully! Status: ${result.status}, Added: ${result.added} items.`);
                } catch (e) {
                    // This will catch the case where the response is a 204 No Content
                    // or any other successful response that doesn't have a JSON body.
                    alert('File uploaded successfully!');
                }
            } else {
                // This block now only runs for true errors (4xx, 5xx).
                const errorResult = await response.json();
                alert(`File upload failed: ${JSON.stringify(errorResult)}`);
            }

        } catch (error) {
            console.error('Network error during file upload:', error);
            alert('Could not connect to the server.');
        } finally {
            buttonElement.disabled = false;
            buttonElement.innerHTML = originalButtonContent;
            feather.replace();
        }
    }
    async function handleDownloadData(buttonElement) {
        const originalButtonContent = buttonElement.innerHTML;
        buttonElement.disabled = true;
        buttonElement.innerHTML = `<i data-feather="loader" class="spin"></i> Downloading...`;
        feather.replace();

        const accessToken = localStorage.getItem('accessToken');
        const username = localStorage.getItem('username');
        if (!accessToken || !username) {
            alert('Authentication error. Please log in again.');
            // Restore button before exiting
            buttonElement.disabled = false;
            buttonElement.innerHTML = originalButtonContent;
            feather.replace();
            return;
        }

        try {
            const response = await fetch(`https://emotuna-backend-production.up.railway.app/api/dataset/?username=${username}`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });

            if (response.status === 401) {
                alert("Your session has expired. Please log in again.");
                logout();
                return;
            }

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `${username}_sft_dataset.json`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } else {
                const errorResult = await response.json();
                alert(`Failed to download data: ${JSON.stringify(errorResult)}`);
            }
        } catch (error) {
            console.error('Network error during data download:', error);
            alert('Could not connect to the server.');
        } finally {
            buttonElement.disabled = false;
            buttonElement.innerHTML = originalButtonContent;
            feather.replace();
        }
    }
    async function handleRequestTraining(buttonElement) {
        const originalButtonContent = buttonElement.innerHTML;
        buttonElement.disabled = true;
        buttonElement.innerHTML = `<i data-feather="loader" class="spin"></i> Requesting...`;
        feather.replace();

        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) {
            alert('Authentication error.');
            buttonElement.disabled = false;
            buttonElement.innerHTML = originalButtonContent;
            feather.replace();
            return;
        }

        try {
            // Step 1: Send the request to start the training process.
            const response = await fetch(`https://emotuna-backend-production.up.railway.app/api/agent_status/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify({ agent_training_status: 'pending' })
            });

            if (response.status === 401) {
                alert("Your session has expired. Please log in again.");
                logout();
                return;
            }

            if (response.ok) {
                // Step 2: Inform the user and start polling.
                alert('Your model has been queued for training! You will be notified when it is complete.');

                // Start checking the status every 30 seconds.
                const trainingPollInterval = setInterval(async () => {
                    const status = await checkTrainingStatus();
                    console.log(`Polling training status: ${status}`);

                    if (status === 'completed') {
                        // SUCCESS: Stop polling and notify the user.
                        clearInterval(trainingPollInterval);
                        await createNotification("Training Complete", "Your self-trained model is now ready to be used.");

                        // Optional: You could send another PATCH request here to set the
                        // backend status back to 'idle' so the user isn't notified again.

                    } else if (status === 'failed') {
                        // FAILURE: Stop polling and notify the user of the error.
                        clearInterval(trainingPollInterval);
                        //await createNotification("Training Failed", "There was an error during model training. Please contact support.");
                    }
                    // If status is 'pending' or 'idle', the interval will just continue.

                }, 30000); // 30,000 milliseconds = 30 seconds

            } else {
                const errorResult = await response.json();
                throw new Error(`Failed to request training: ${JSON.stringify(errorResult)}`);
            }
        } catch (error) {
            alert(error.message);
        } finally {
            // The button is re-enabled immediately so the user can navigate away.
            // The polling will continue in the background.
            buttonElement.disabled = false;
            buttonElement.innerHTML = originalButtonContent;
            feather.replace();
        }
    }
    async function handleFetchNotifications() {
        const listElement = document.getElementById('notification-list');
        const dotElement = document.querySelector('#notification-icon-wrapper .notification-dot');
        const panelElement = document.getElementById('notification-panel');
        const headerElement = panelElement ? panelElement.querySelector('.dropdown-header') : null;
        const footerElement = panelElement ? panelElement.querySelector('#notification-footer') : null;

        if (!listElement || !dotElement || !panelElement || !headerElement || !footerElement) return;

        // Only show loading state if the panel is currently open
        if (panelElement.classList.contains('active')) {
            listElement.innerHTML = `<p class="loading-state">Loading notifications...</p>`;
        }

        try {
            const accessToken = localStorage.getItem('accessToken');
            if (!accessToken) return;

            const response = await fetch('https://emotuna-backend-production.up.railway.app/api/notifications/', {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });

            if (!response.ok) {
                console.error(`Failed to fetch notifications: ${response.status}`);
                if (panelElement.classList.contains('active')) {
                    listElement.innerHTML = `<p class="error-state">Could not load notifications.</p>`;
                }
                return;
            }

            const notifications = await response.json();

            // --- UI Logic ---
            const hasUnread = notifications.some(n => n.read === false);
            dotElement.classList.toggle('visible', hasUnread);

            // Only update the list if the panel is actually open
            if (panelElement.classList.contains('active')) {
                listElement.innerHTML = '';

                if (notifications.length > 0) {
                    // If there ARE notifications, show the header and footer
                    headerElement.style.display = 'flex';
                    footerElement.style.display = 'block';
                    notifications.forEach(notif => {
                        const notifHTML = createNotificationHTML(notif);
                        listElement.insertAdjacentHTML('beforeend', notifHTML);
                    });
                } else {
                    // If there are NO notifications, hide the header and footer
                    headerElement.style.display = 'none';
                    footerElement.style.display = 'none';
                    listElement.innerHTML = `
                    <div class="empty-notification-state">
                        <i data-feather="check-circle"></i>
                        <h4>All Caught Up</h4>
                        <p>You have no new notifications.</p>
                    </div>
                `;
                }
                feather.replace();
            }

        } catch (error) {
            console.error("Error during notification fetch:", error);
        }
    }
    async function handleMarkOneRead(notificationId) {
        console.log(`Sending PATCH to mark notification ${notificationId} as read...`);
        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) return false;

        try {
            const response = await fetch(`https://emotuna-backend-production.up.railway.app/api/notifications/${notificationId}/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify({ is_read: true })
            });

            if (response.ok) {
                console.log(`Successfully marked notification ${notificationId} as read.`);
                return true;
            } else {
                // If the response is not OK, something went wrong on the backend.
                const errorData = await response.json();
                throw new Error(JSON.stringify(errorData));
            }
        } catch (error) {
            console.error("Failed to mark notification as read:", error);
            alert(`Could not update the notification: ${error.message}`);
            return false;
        }
    }
    async function handleMarkAllRead() {
        console.log("Starting 'Mark All as Read' process...");
        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) return false;

        try {
            // Step 1: Fetch ALL notifications to identify the unread ones.
            const response = await fetch('https://emotuna-backend-production.up.railway.app/api/notifications/', {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });

            if (!response.ok) {
                throw new Error("Could not fetch notifications to mark them as read.");
            }

            const allNotifications = await response.json();

            // Step 2: Filter to find only the unread notifications that need updating.
            const unreadNotifications = allNotifications.filter(n => n.is_read === false);

            if (unreadNotifications.length === 0) {
                console.log("No unread notifications to mark.");
                return true; // Nothing to do, so it's a "success".
            }

            console.log(`Found ${unreadNotifications.length} unread notifications. Sending update requests...`);

            // Step 3: Create an array of PATCH request promises, one for each unread notification.
            const updatePromises = unreadNotifications.map(notification => {
                return fetch(`https://emotuna-backend-production.up.railway.app/api/notifications/${notification.id}/`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken}`
                    },
                    body: JSON.stringify({ is_read: true })
                });
            });

            // Step 4: Execute all the update requests in parallel and wait for them all to complete.
            const responses = await Promise.all(updatePromises);

            // Step 5: Check if any of the requests failed.
            const allSucceeded = responses.every(res => res.ok);

            if (!allSucceeded) {
                console.error("One or more notifications failed to be marked as read.");
                alert("Could not mark all notifications as read. Some may have failed.");
            } else {
                console.log("All notifications successfully marked as read.");
            }

            return allSucceeded;

        } catch (error) {
            console.error("Error during 'Mark All as Read' process:", error);
            alert("An error occurred while marking notifications as read.");
            return false;
        }
    }
    async function handleDeleteOne(notificationId) {
        console.log(`Deleting notification ${notificationId}...`);
        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) return false;

        try {
            const response = await fetch(`https://emotuna-backend-production.up.railway.app/api/notifications/${notificationId}/`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            return response.ok;
        } catch (error) {
            console.error("Failed to delete notification:", error);
            alert("Could not delete the notification. Please check your connection.");
            return false;
        }
    }
    async function handleDeleteAll() {
        console.log("Starting 'Delete All' process...");
        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) {
            alert("Authentication error.");
            return false;
        }

        try {
            // Step 1: Fetch the list of ALL notifications to get their IDs.
            const response = await fetch('https://emotuna-backend-production.up.railway.app/api/notifications/', {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });

            if (!response.ok) {
                throw new Error("Could not fetch notifications to delete them.");
            }

            const allNotifications = await response.json();

            if (allNotifications.length === 0) {
                console.log("No notifications to delete.");
                return true; // Nothing to do, so consider it a success.
            }

            console.log(`Found ${allNotifications.length} notifications to delete. Sending requests...`);

            // Step 2: Create an array of DELETE request promises, one for each notification.
            const deletePromises = allNotifications.map(notification => {
                return fetch(`https://emotuna-backend-production.up.railway.app/api/notifications/${notification.id}/`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });
            });

            // Step 3: Execute all delete requests in parallel and wait for them to complete.
            const responses = await Promise.all(deletePromises);

            // Step 4: Check if any of the requests failed.
            const allSucceeded = responses.every(res => res.ok);

            if (!allSucceeded) {
                console.error("One or more notifications failed to be deleted.");
                alert("Could not delete all notifications. Some may have failed.");
            } else {
                console.log("All notifications successfully deleted.");
            }

            return allSucceeded;

        } catch (error) {
            console.error("Error during 'Delete All' process:", error);
            alert("An error occurred while deleting notifications.");
            return false;
        }
    }

    async function handleRunAgent(modelChoice, buttonElement) {
        console.log("Initiating agent start sequence...");
        updateAgentUI('starting'); // Show "Starting..." UI immediately

        // Step 1: Send the initial "start" command.
        const commandSent = await sendStartCommand(modelChoice);


        if (!commandSent) {
            // If the initial command fails (e.g., auth error), stop immediately.
            updateAgentUI('stopped');
            return;
        }

        // Step 2: Wait for 20 seconds.
        console.log("Start command sent. Waiting 20 seconds for backend to process...");
        await new Promise(resolve => setTimeout(resolve, 20000));

        // Step 3: After waiting, check if a PIN is now required.
        console.log("Checking for PIN requirement...");
        const pinIsRequired = await checkTelegramPinRequirement();

        if (pinIsRequired) {
            console.log("PIN is required. Showing modal.");
            // Go back to 'stopped' so the background isn't confusing.
            updateAgentUI('stopped');
            showPinModal(async () => {
                // This callback runs only after a successful PIN entry.
                console.log("PIN verified. Now polling for agent to be fully running...");
                updateAgentUI('starting');
                pollForAgentStart();
            });
        } else {
            // If no PIN is needed after the 20s wait, we can assume it connected.
            // Now, poll to confirm it's in the 'running' state.
            console.log("No PIN required. Polling for agent to be ready...");
            pollForAgentStart();
        }
    }

    function showPinModal(onSuccessCallback) {
        const modalOverlay = document.getElementById('pin-modal-overlay');
        const modalForm = document.getElementById('modal-pin-form');
        const modalContent = document.getElementById('pin-modal-content');
        const verifyBtn = document.getElementById('modal-verify-btn');
        const cancelBtn = document.getElementById('modal-cancel-btn');
        const pinInput = modalForm.querySelector('input[name="telegram_pin_code"]');
        if (!modalOverlay) return;

        if (pinInput) pinInput.value = '';
        modalOverlay.style.display = 'flex';
        setTimeout(() => modalOverlay.classList.add('active'), 10);

        const closeModal = () => {
            modalOverlay.classList.remove('active');
            setTimeout(() => modalOverlay.style.display = 'none', 300);
            verifyBtn.onclick = null;
            cancelBtn.onclick = null;
        };

        cancelBtn.onclick = () => {
            closeModal();
            updateAgentUI('stopped');
        };

        verifyBtn.onclick = async () => {
            if (!modalForm.checkValidity()) return modalForm.reportValidity();

            const pinSuccess = await handleVerifyPinCode(modalForm);

            if (!pinSuccess) {
                // If PIN is wrong, shake the modal and stop.
                if (modalContent) {
                    modalContent.classList.add('shake');
                    setTimeout(() => modalContent.classList.remove('shake'), 500);
                }
                return;
            }

            // --- SUCCESS ---
            // We have verified the PIN is correct.

            // --- [THIS IS THE CRITICAL FIX] ---
            // Now, tell the backend not to ask for the PIN again for this session.
            await setPinRequiredStatus(false);

            // Close the modal and execute the next step (polling).
            closeModal();
            if (onSuccessCallback) {
                onSuccessCallback();
            }
        };
    }
    function logout() {
        localStorage.clear();
        if (messagePollingInterval) clearInterval(messagePollingInterval);
        stopNotificationPolling();
        window.location.reload();
    }
    // ======================================================
    // --- 3. MASTER INITIALIZATION & APP LOGIC ---
    // ======================================================

    const switchView = (viewId) => {
        const allViews = [
            'intro-wrapper', 'signup-wrapper', 'login-wrapper',
            'platform-choice-wrapper', 'telegram-connect-wrapper', 'main-app-wrapper'
        ];
        allViews.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.remove('active');
        });
        const targetView = document.getElementById(viewId);
        if (targetView) {
            targetView.classList.add('active');
        }
    };
    function setupOnboardingListeners() {
        // --- This function sets up all clicks for the unauthenticated views ---

        document.getElementById('get-started-btn').addEventListener('click', () => switchView('signup-wrapper'));

        document.getElementById('signup-next-btn').addEventListener('click', async (e) => {
            e.preventDefault();
            const form = document.getElementById('signup-form');
            if (!form.checkValidity()) return form.reportValidity();
            const user = await handleRegisterUser(form);
            if (user) switchView('platform-choice-wrapper');
        });

        document.getElementById('connect-telegram-card').addEventListener('click', () => switchView('telegram-connect-wrapper'));

        document.getElementById('send-code-btn').addEventListener('click', async (e) => {
            e.preventDefault();
            const form = document.getElementById('telegram-connect-form');
            if (!form.checkValidity()) return form.reportValidity();
            const success = await handleSendTelegramDetails(form);
            if (success) {
                initializeApp(); // Let the router handle the next step after successful onboarding
            }
        });

        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleUserLogin(e.target);
        });

        // Simple navigation links
        document.getElementById('go-to-login-link').addEventListener('click', (e) => { e.preventDefault(); switchView('login-wrapper'); });
        document.getElementById('go-to-signup-link').addEventListener('click', (e) => { e.preventDefault(); switchView('signup-wrapper'); });

        // --- [FIX #1: "Go Back to Sign Up" LINK] ---
        const backToSignupLink = document.getElementById('back-to-signup-link');
        if (backToSignupLink) {
            backToSignupLink.addEventListener('click', (e) => {
                e.preventDefault();
                switchView('signup-wrapper');
            });
        }

        // --- [FIX #2: "Choose a different platform" LINK] ---
        const backToPlatformLink = document.getElementById('back-to-platform-choice-link');
        if (backToPlatformLink) {
            backToPlatformLink.addEventListener('click', (e) => {
                e.preventDefault();
                switchView('platform-choice-wrapper');
            });
        }

        // Coming Soon Modal Logic
        const comingSoonModal = document.getElementById('coming-soon-modal');
        if (comingSoonModal) {
            const modalPlatformName = document.getElementById('modal-platform-name');
            const closeSoonModalBtn = document.getElementById('close-soon-modal-btn');

            document.querySelectorAll('.platform-card.coming-soon').forEach(card => {
                card.addEventListener('click', () => {
                    if (modalPlatformName) modalPlatformName.textContent = card.dataset.platform;
                    comingSoonModal.style.display = 'flex';
                    setTimeout(() => comingSoonModal.classList.add('active'), 10);
                });
            });

            if (closeSoonModalBtn) {
                closeSoonModalBtn.addEventListener('click', () => {
                    comingSoonModal.classList.remove('active');
                    setTimeout(() => comingSoonModal.style.display = 'none', 300);
                });
            }
        }
    }


    async function setupDashboard() {
        console.log("--- Setting up Dashboard ---");

        const agentStarter = document.getElementById('agent-starter');
        const agentChoice = document.getElementById('agent-choice');
        const agentStarting = document.getElementById('agent-starting');
        const agentActive = document.getElementById('agent-active');
        const messagesContainer = document.getElementById('messages-container');
        const runAgentBtn = document.getElementById('run-agent-btn');
        const agentModelBtns = document.querySelectorAll('.agent-model-btn');
        const stopAgentBtn = document.getElementById('stop-agent-btn');
        const messageList = document.getElementById('message-list');
        const tabs = document.querySelectorAll('.message-tabs .tab-btn');
        const navRight = document.querySelector('.nav-right');
        const historyIcon = document.getElementById('history-icon');
        const backBtns = document.querySelectorAll('.back-btn');
        const settingsView = document.getElementById('settings-view');
        const profileDropdown = document.getElementById('profile-dropdown');
        const notificationPanel = document.getElementById('notification-panel');
        const autoDmToggle = document.getElementById('auto-dm-toggle');
        const uploadDataBtn = document.getElementById('upload-data-btn');
        const downloadDataBtn = document.getElementById('download-data-btn');
        const trainModelBtn = document.getElementById('train-model-btn');
        const fileUploadInput = document.getElementById('file-upload-input');
        const navbarBrand = document.getElementById('navbar-brand');

        updateAgentUI = (state) => {
            if (!agentStarter || !agentChoice || !agentStarting || !agentActive || !messagesContainer) return;
            agentStarter.style.display = 'none';
            agentChoice.style.display = 'none';
            agentStarting.style.display = 'none';
            agentActive.style.display = 'none';
            messagesContainer.style.display = 'none';
            if (state === 'stopped') agentStarter.style.display = 'flex';
            else if (state === 'choosing') agentChoice.style.display = 'flex';
            else if (state === 'starting') agentStarting.style.display = 'flex';
            else if (state === 'running') {
                agentActive.style.display = 'flex';
                messagesContainer.style.display = 'block';
            }
        };

        // In script.js

        pollForAgentStart = () => {
            if (agentStartPollingInterval) clearInterval(agentStartPollingInterval);

            const startupTimeout = setTimeout(() => {
                clearInterval(agentStartPollingInterval);
                alert("Agent failed to start within the time limit. Check backend logs for errors.");
                updateAgentUI('stopped');
            }, 60000);

            let pollCount = 0;

            agentStartPollingInterval = setInterval(async () => {
                pollCount++;
                const agentStatus = await checkAgentStatus();
                console.log(`Polling agent status (Attempt #${pollCount}):`, agentStatus);

                // --- THIS IS THE CRITICAL FIX ---
                // Check for EITHER `is_running` OR `running` being true.
                const isRunning = agentStatus && (agentStatus.is_running === true || agentStatus.running === true);

                if (isRunning) {
                    console.log("Success! Agent is now running.");
                    clearInterval(agentStartPollingInterval);
                    clearTimeout(startupTimeout);
                    localStorage.setItem('agentIsRunning', 'true');
                    updateAgentUI('running');
                    // This 'await' is important for the notification to be created reliably.
                    await createNotification("Agent Started", "Your AI agent is now running.");
                    await handleFetchMessages('important', messageList);
                    startMessagePolling(messageList);
                    startNotificationPolling();
                }

            }, 5000);
        };


        const switchDashboardView = (viewId) => {
            localStorage.setItem('lastActiveDashboardView', viewId); // Remember the last view

            const subViews = ['dashboard-view', 'history-view', 'settings-view', 'privacy-view', 'about-us-view'];
            subViews.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.remove('active');
            });
            if (viewId === 'settings-view') {
                // We need data from two endpoints. Let's create a temporary helper
                // function to fetch the Telegram data.
                const fetchTelegramData = async () => {
                    const accessToken = localStorage.getItem('accessToken');
                    if (!accessToken) return null;
                    try {
                        const response = await fetch('https://emotuna-backend-production.up.railway.app/api/telegram/', {
                            headers: { 'Authorization': `Bearer ${accessToken}` }
                        });
                        if (response.ok) return await response.json();
                        return null;
                    } catch (error) {
                        console.error("Failed to fetch telegram data for settings:", error);
                        return null;
                    }
                };

                // Use Promise.all to fetch both data sources simultaneously.
                Promise.all([
                    handleFetchUserProfile(), // Fetches from /api/profile/
                    fetchTelegramData()       // Fetches from /api/telegram/
                ]).then(([profileData, telegramData]) => {

                    // Combine the data into one object before sending it to the form filler.
                    const combinedData = {
                        ...profileData, // Contains username, email, etc.
                        ...telegramData // Contains telegram_mobile_number
                    };

                    // Now, populate the form with the complete data object.
                    if (combinedData) {
                        populateSettingsForm(combinedData);
                    }
                });

            } else if (viewId === 'history-view') {
                handleFetchHistory();
            }
            const target = document.getElementById(viewId);
            if (target) target.classList.add('active');
            feather.replace();
        };

        const populateSettingsForm = (data) => {
            const usernameDisplay = document.getElementById('setting-username-display');
            const emailDisplay = document.getElementById('setting-email-display');
            const phoneDisplay = document.getElementById('setting-phone-display');
            const planDisplay = document.getElementById('setting-plan-display');
            if (usernameDisplay) usernameDisplay.textContent = data.username || 'N/A';
            if (emailDisplay) emailDisplay.textContent = data.email || 'N/A';
            if (phoneDisplay) phoneDisplay.textContent = data.telegram_mobile_number || 'N/A';
            if (planDisplay) planDisplay.textContent = data.subscription_plan || 'Free';
        };

        const toggleEditMode = (field, isEditing) => {
            const displayMode = document.getElementById(`${field}-display-mode`);
            const editMode = document.getElementById(`${field}-edit-mode`);
            const input = document.getElementById(`setting-${field}-input`);
            const display = document.getElementById(`setting-${field}-display`);
            if (isEditing) {
                if (input && display) input.value = display.textContent;
                if (displayMode) displayMode.classList.remove('active');
                if (editMode) editMode.classList.add('active');
                if (input) input.focus();
            } else {
                if (displayMode) displayMode.classList.add('active');
                if (editMode) editMode.classList.remove('active');
            }
        };

        // REPLACE WITH THIS BLOCK in setupDashboard()

        // REPLACE WITH THIS BLOCK in setupDashboard()

        // --- 3. GET ALL INITIAL STATE FROM BACKEND ---
        console.log("Fetching initial agent and auto-reply status...");

        const [initialAgentStatus, initialAutoReplyState] = await Promise.all([
            checkAgentStatus(),
            fetchAutoReplyStatus()
        ]);

        // --- THIS IS THE FIX ---
        // Use the same robust check that handles both 'is_running' and 'running' keys.
        const isAgentRunning = initialAgentStatus ?
            (initialAgentStatus.is_running === true || initialAgentStatus.running === true) :
            false;

        // --- 4. INITIALIZE STATE & UI FROM FETCHED DATA ---
        localStorage.setItem('agentIsRunning', isAgentRunning);

        // Set the state based on the data from our new, dedicated function
        isAutoReplyEnabled = initialAutoReplyState;
        if (autoDmToggle) {
            autoDmToggle.checked = isAutoReplyEnabled;
        }
        console.log(`Initial State Set: Agent Running = ${isAgentRunning}, Auto-Reply = ${isAutoReplyEnabled}`);

        // --- 4. ATTACH LISTENERS ---
        if (navbarBrand) {
            navbarBrand.addEventListener('click', (e) => {
                // Prevent the default link behavior (like adding '#' to the URL)
                e.preventDefault();

                // Use the existing function to switch to the main dashboard view
                switchDashboardView('dashboard-view');
            });
        }
        if (runAgentBtn) runAgentBtn.addEventListener('click', () => updateAgentUI('choosing'));
        agentModelBtns.forEach(btn => btn.addEventListener('click', () => handleRunAgent(btn.dataset.model, btn)));

        if (stopAgentBtn) stopAgentBtn.addEventListener('click', async (e) => {
            if (agentStartPollingInterval) clearInterval(agentStartPollingInterval);
            const success = await handleStopAgent(e.target.closest('button'));
            if (success) {
                updateAgentUI('stopped');
                stopMessagePolling();
                stopNotificationPolling();
            }
        });

        if (tabs) tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                handleFetchMessages(tab.dataset.category, messageList);
            });
        });

        if (messageList) {
            messageList.addEventListener('click', async (e) => {
                const sendButton = e.target.closest('.btn-approve-send');
                if (!sendButton) return;
                const messageCard = e.target.closest('.message-card');
                if (!messageCard) return;
                const success = await handleApproveAndSend(messageCard.dataset.messageId, messageCard);
                if (success) {
                    const interactionArea = messageCard.querySelector('.interaction-area');
                    if (interactionArea) interactionArea.innerHTML = `<div class="confirmation-message"><i data-feather="check-circle"></i><span>Reply Sent!</span></div>`;
                    feather.replace();
                    setTimeout(() => {
                        messageCard.classList.add('fading-out');
                        setTimeout(() => {
                            messageCard.remove();
                            if (messageList.children.length === 0) {
                                messageList.innerHTML = `<p class="empty-state">No pending messages in this category.</p>`;
                            }
                        }, 500);
                    }, 2000);
                }
            });
        }

        if (historyIcon) historyIcon.addEventListener('click', () => switchDashboardView('history-view'));
        if (backBtns) backBtns.forEach(btn => btn.addEventListener('click', () => switchDashboardView(btn.dataset.targetView)));
        if (uploadDataBtn) uploadDataBtn.addEventListener('click', () => fileUploadInput.click());
        if (fileUploadInput) fileUploadInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) handleUploadData(file, uploadDataBtn);
            e.target.value = null;
        });
        if (downloadDataBtn) downloadDataBtn.addEventListener('click', (e) => handleDownloadData(e.target.closest('button')));
        if (trainModelBtn) trainModelBtn.addEventListener('click', (e) => handleRequestTraining(e.target.closest('button')));

        if (autoDmToggle) autoDmToggle.addEventListener('change', async () => {
            const newIsEnabledState = autoDmToggle.checked;
            autoDmToggle.disabled = true;
            const success = await handleUpdateAutoReplyStatus(newIsEnabledState);
            if (success) {
                isAutoReplyEnabled = newIsEnabledState;
            } else {
                autoDmToggle.checked = isAutoReplyEnabled;
            }
            autoDmToggle.disabled = false;
        });

        if (profileDropdown) {
            profileDropdown.addEventListener('click', (e) => {
                const item = e.target.closest('.dropdown-item');
                if (!item) return;
                e.stopPropagation();
                if (item.id === 'logout-btn') return logout();
                if (item.dataset.targetView) {
                    switchDashboardView(item.dataset.targetView);
                    profileDropdown.classList.remove('active');
                }
            });
        }

        if (notificationPanel) {
            notificationPanel.addEventListener('click', async (e) => {
                e.stopPropagation();
                const notificationItem = e.target.closest('.notification-item');
                const notificationId = notificationItem ? notificationItem.dataset.id : null;
                if (e.target.closest('.btn-mark-read')) {
                    const success = await handleMarkOneRead(notificationId);
                    if (success) handleFetchNotifications();
                } else if (e.target.closest('.btn-delete')) {
                    if (confirm('Delete this notification?')) {
                        const success = await handleDeleteOne(notificationId);
                        if (success) handleFetchNotifications();
                    }
                } else if (e.target.closest('#mark-all-read-btn')) {
                    const success = await handleMarkAllRead();
                    if (success) handleFetchNotifications();
                } else if (e.target.closest('#delete-all-btn')) {
                    if (confirm('Are you sure you want to delete ALL notifications?')) {
                        const success = await handleDeleteAll();
                        if (success) handleFetchNotifications();
                    }
                }
            });
        }

        if (settingsView) {
            settingsView.addEventListener('click', async (e) => {
                const target = e.target.closest('button');
                if (!target) return;
                if (target.id === 'edit-username-btn') toggleEditMode('username', true);
                if (target.id === 'cancel-username-btn') toggleEditMode('username', false);
                if (target.id === 'save-username-btn') {
                    const newUsername = document.getElementById('setting-username-input').value;
                    const success = await handleUpdateUserProfile({ user: { username: newUsername } });
                    if (success) {
                        document.getElementById('setting-username-display').textContent = newUsername;
                        toggleEditMode('username', false);
                    }
                }
                if (target.id === 'edit-email-btn') toggleEditMode('email', true);
                if (target.id === 'cancel-email-btn') toggleEditMode('email', false);
                if (target.id === 'save-email-btn') {
                    const newEmail = document.getElementById('setting-email-input').value;
                    const success = await handleUpdateUserProfile({ user: { email: newEmail } });
                    if (success) {
                        document.getElementById('setting-email-display').textContent = newEmail;
                        toggleEditMode('email', false);
                    }
                }
            });
        }

        if (navRight) {
            navRight.addEventListener('click', (e) => {
                const wrapper = e.target.closest('.nav-icon-wrapper');
                if (!wrapper || !wrapper.id) return;
                e.stopPropagation();
                if (wrapper.id === 'profile-icon-wrapper') {
                    notificationPanel.classList.remove('active');
                    profileDropdown.classList.toggle('active');
                } else if (wrapper.id === 'notification-icon-wrapper') {
                    profileDropdown.classList.remove('active');
                    const isActive = notificationPanel.classList.toggle('active');
                    if (isActive) handleFetchNotifications();
                }
            });
        }

        window.addEventListener('click', (e) => {
            if (!e.target.closest('#profile-icon-wrapper')) {
                if (profileDropdown) profileDropdown.classList.remove('active');
            }
            if (!e.target.closest('#notification-icon-wrapper')) {
                if (notificationPanel) notificationPanel.classList.remove('active');
            }
        });

        // --- 5. SET FINAL UI STATE ---
        if (isAgentRunning) {
            updateAgentUI('running');
            startMessagePolling(messageList);
            startNotificationPolling();
            const lastActiveTab = localStorage.getItem('lastActiveTab') || 'important';
            tabs.forEach(tab => tab.classList.toggle('active', tab.dataset.category === lastActiveTab));
            handleFetchMessages(lastActiveTab, messageList);
        } else {
            updateAgentUI('stopped');
        }

        const lastView = localStorage.getItem('lastActiveDashboardView');
        if (lastView) {
            // If we have a saved view, go to it
            console.log(`Restoring last active view: ${lastView}`);
            switchDashboardView(lastView);
        } else {
            // Otherwise, default to the main dashboard
            switchDashboardView('dashboard-view');
        }
        console.log("--- Dashboard setup complete ---");
    }

    // ===========================================
    // --- 4. STARTUP LOGIC ---
    // ===========================================
    function initializeApp() {
        setupOnboardingListeners();
        const loader = document.getElementById('app-loader');
        const accessToken = localStorage.getItem('accessToken');
        const isFullyOnboarded = localStorage.getItem('isFullyOnboarded') === 'true';
        if (accessToken && isFullyOnboarded) {
            switchView('main-app-wrapper');
            setupDashboard();
        } else if (accessToken) {
            switchView('platform-choice-wrapper');
        } else {
            switchView('intro-wrapper');
        }
        if (loader) {
            loader.classList.add('hidden');
            setTimeout(() => loader.style.display = 'none', 300);
        }
    }

    initializeApp();
});