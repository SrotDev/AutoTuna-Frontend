document.addEventListener('DOMContentLoaded', () => {
    feather.replace();

    let messagePollingInterval = null;
    let agentStartPollingInterval = null; // <-- ENSURE THIS LINE EXISTS
    let updateAgentUI = () => { };
    let pollForAgentStart = () => { };
    let notificationPollingInterval = null;
    let isAutoReplyEnabled = false;
    // =================================================
    // --- 1. ALL BACKEND & HELPER FUNCTIONS ---
    // =================================================
    // In script.js

    // =================================================
    // --- 1. ALL BACKEND & HELPER FUNCTIONS ---
    // =================================================
    function createNotificationHTML(notification) {
        const isUnread = !notification.read;
        const icon = isUnread ? 'bell' : 'check-circle';

        return `
        <div class="notification-item ${isUnread ? 'unread' : ''}" data-id="${notification.id}">
            <div class="notification-icon"><i data-feather="${icon}"></i></div>
            <div class="notification-content">
                <span class="title">${notification.title || 'Notification'}</span>
                <span class="body">${notification.body || ''}</span>
                <span class="time">${new Date(notification.timestamp).toLocaleString()}</span>
            </div>
        </div>`;
    }

    /**
 * Updates the user's auto-reply status on the backend.
 * @param {boolean} isEnabled - The new status for auto-reply.
 * @returns {Promise<boolean>} True if the update was successful, otherwise false.
 */
    async function handleUpdateAutoReplyStatus(isEnabled) {
        console.log(`Setting auto-reply status to: ${isEnabled}`);
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
                body: JSON.stringify({ agent_auto_reply: isEnabled })
            });

            if (!response.ok) {
                console.error("Failed to update auto-reply status on the backend.");
                alert("Could not save the auto-reply setting. Please try again.");
                return false;
            }
            return true;
        } catch (error) {
            console.error("Network error while updating auto-reply status:", error);
            alert("Could not connect to the server to save the setting.");
            return false;
        }
    }
    /**
     * Creates the HTML string for a single history card item.
     * This version is simpler as it's not interactive.
     */
    function createHistoryCardHTML(msg) {
        const sentimentClass = msg.sentiment ? `sentiment-${msg.sentiment.toLowerCase()}` : 'sentiment-neutral';

        return `
    <div class="message-card history-card glass-card ${sentimentClass}" data-message-id="${msg.id}">
        <div class="message-card-header">
            <div class="message-sender">
                <i data-feather="user"></i>
                <span>${msg.contact_username || 'Unknown'}</span>
            </div>
            <div class="message-timestamp">${new Date(msg.timestamp).toLocaleString()}</div>
        </div>
        <p class="message-content"><strong>Original:</strong> ${msg.message}</p>
        <div class="ai-reply-section">
            <div class="ai-reply-header">
                <h4>Your Reply</h4>
                <span class="sentiment-tag">Score: ${msg.score !== null ? msg.score : 'N/A'}</span>
            </div>
            <div class="ai-reply-body">
                <p>${msg.reply_message || 'No reply found.'}</p>
            </div>
        </div>
    </div>`;
    }

    /**
     * Fetches sent messages (history) from the backend and renders them.
     */
    async function handleFetchHistory() {
        const listElement = document.getElementById('history-list');
        if (!listElement) return;

        listElement.innerHTML = `<p class="loading-state">Loading history...</p>`;

        try {
            const accessToken = localStorage.getItem('accessToken');
            if (!accessToken) throw new Error("Authentication error.");

            // --- THIS IS THE KEY CHANGE: reply_sent=true ---
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

    /**
 * Starts a background loop to periodically check for new notifications.
 */
    function startNotificationPolling() {
        stopNotificationPolling(); // Prevent multiple loops
        console.log("Starting notification polling (checking every 30 seconds)...");

        // Check immediately when starting
        handleFetchNotifications();

        notificationPollingInterval = setInterval(() => {
            handleFetchNotifications();
        }, 30000); // Check for new notifications every 30 seconds
    }

    /**
     * Stops the background loop for notifications.
     */
    function stopNotificationPolling() {
        if (notificationPollingInterval) {
            console.log("Stopping notification polling.");
            clearInterval(notificationPollingInterval);
            notificationPollingInterval = null;
        }
    }
    async function checkTrainingStatus() {
        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) return null;
        try {
            // This assumes your /api/profile/ endpoint returns the training status
            const response = await fetch('https://emotuna-backend-production.up.railway.app/api/profile/', {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            if (response.ok) {
                const data = await response.json();
                return data.agent_training_status; // e.g., 'pending', 'completed', 'idle'
            }
            return null;
        } catch (error) {
            return null;
        }
    }
    /**
 * Creates a new notification. Sends it to the backend to be saved
 * and updates the UI to show that a new notification exists.
 * @param {string} title - The title of the notification.
 * @param {string} body - The main content/body of the notification.
 */
    /**
 * Creates a new notification. Sends it to the backend to be saved
 * and updates the UI to show that a new notification exists.
 * @param {string} title - The title of the notification.
 * @param {string} body - The main content/body of the notification.
 */


    const startMessagePolling = (messageList) => {
        stopMessagePolling();
        messagePollingInterval = setInterval(() => {
            const activeTab = document.querySelector('.message-tabs .tab-btn.active');
            const category = activeTab ? activeTab.dataset.category : 'general';
            handleFetchMessages(category, messageList);
        }, 20000);
    };

    const stopMessagePolling = () => {
        if (messagePollingInterval) {
            clearInterval(messagePollingInterval);
            messagePollingInterval = null;
        }
    }


    async function checkPinRequirement() {
        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) return false;
        try {
            // NOTE: This assumes a backend endpoint that can report the PIN status.
            // It might be the same as agent-status, or a dedicated one.
            // It should return something like: { "pin_required": true }
            const response = await fetch('https://emotuna-backend-production.up.railway.app/api/agent-status/', {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            if (response.ok) {
                const result = await response.json();
                return result.pin_required === true;
            }
            return false;
        } catch (error) {
            console.error("Error checking PIN requirement:", error);
            return false;
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
            if (response.ok) {
                return await response.json();
            }
            return null;
        } catch (error) {
            console.error("Failed to fetch user profile:", error);
            return null;
        }
    }

    async function handleUpdateUserProfile(dataToUpdate) {
        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) {
            alert("Authentication error. Please log in again.");
            return false; // Failure
        }

        try {
            const response = await fetch('https://emotuna-backend-production.up.railway.app/api/profile/', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify(dataToUpdate)
            });

            if (response.ok) {
                // The backend successfully processed the request.
                alert("Profile updated successfully!");
                return true; // Explicitly return true on success
            } else {
                // The backend processed the request but found an error (e.g., validation).
                const errorData = await response.json();
                const errorMessage = Object.values(errorData).flat().join('\n'); // Nicely format validation errors
                alert(`Update failed: ${errorMessage}`);
                return false; // Explicitly return false on failure
            }
        } catch (error) {
            // A network or other unexpected error occurred.
            console.error("Error during profile update:", error);
            alert("An error occurred while updating your profile. Please check the console.");
            return false; // Explicitly return false on failure
        }
    }
    function logout() {
        localStorage.clear();
        if (messagePollingInterval) clearInterval(messagePollingInterval);
        stopNotificationPolling();
        window.location.reload();
    }
    /**
     * A centralized, smart wrapper for all authenticated API calls.
     * It automatically handles token refresh and error parsing.
     * @param {string} url - The API endpoint URL.
     * @param {object} options - The options for the fetch call (method, headers, body).
     * @returns {Promise<{success: boolean, data: any}>} An object with success status and the resulting data.
     */
    async function handleApiRequest(url, options = {}) {
        try {
            let accessToken = localStorage.getItem('accessToken');

            const headers = {
                ...options.headers,
                'Authorization': `Bearer ${accessToken}`
            };

            let response = await fetch(url, { ...options, headers });

            if (response.status === 401) {
                // Token is expired, try to refresh it
                const newAccessToken = await getNewAccessToken();
                if (newAccessToken) {
                    // Retry the request with the new token
                    headers['Authorization'] = `Bearer ${newAccessToken}`;
                    response = await fetch(url, { ...options, headers });
                } else {
                    // Refresh failed, log the user out
                    alert("Your session has expired. Please log in again.");
                    logout();
                    return { success: false, data: { error: "Session expired" } };
                }
            }

            if (!response.ok) {
                // Handle other server errors (404, 500, etc.)
                const errorData = await response.json().catch(() => ({ detail: "An unknown server error occurred." }));
                console.error(`API Error: ${response.status}`, errorData);
                return { success: false, data: errorData };
            }

            // Handle successful responses
            if (response.status === 204) { // 204 No Content
                return { success: true, data: null };
            }

            const data = await response.json();
            return { success: true, data };

        } catch (error) {
            console.error('Network Error:', error);
            return { success: false, data: { error: "Could not connect to the server." } };
        }
    }

    /**
     * Attempts to get a new access token using the refresh token.
     */
    async function getNewAccessToken() {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) return null;

        try {
            const response = await fetch('https://emotuna-backend-production.up.railway.app/api/token/refresh/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh: refreshToken })
            });
            if (response.ok) {
                const result = await response.json();
                localStorage.setItem('accessToken', result.access);
                return result.access;
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    // ... your other functions (handleRegisterUser, handleUserLogin, etc.) ...
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
                const errorMessage = result.detail || JSON.stringify(result);
                if (JSON.stringify(errorMessage).includes("already exists")) {
                    alert("This username is already taken. Please try another.");
                } else {
                    alert(`Registration failed: ${errorMessage}`);
                }
                return null;
            }
        } catch (error) {
            alert('Could not connect to the server.');
            return null;
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }
    }

    async function handleUserLogin(formElement) {
        const submitButton = formElement.querySelector('button');
        const originalButtonText = submitButton.textContent;
        const formData = new FormData(formElement);
        const loginData = Object.fromEntries(formData.entries());
        submitButton.disabled = true;
        submitButton.textContent = 'Logging In...';
        try {
            const response = await fetch('https://emotuna-backend-production.up.railway.app/api/login/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(loginData)
            });
            const result = await response.json();
            if (response.ok) {
                // Set the session credentials
                localStorage.setItem('accessToken', result.access);
                localStorage.setItem('refreshToken', result.refresh);
                localStorage.setItem('username', result.username);
                localStorage.setItem('isFullyOnboarded', result.is_onboarded === true);

                // --- THIS IS THE CRITICAL FIX ---
                // Instead of reloading, we now call the central router.
                // initializeApp will read the new localStorage values and show the correct view.
                initializeApp();

                return result; // Still return the user data
            } else {
                const errorMessage = result.detail || JSON.stringify(result);
                alert(`Login failed: ${errorMessage}`);
                return null;
            }
        } catch (error) {
            alert('Could not connect to the server.');
            return null;
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
        if (!accessToken || !username) {
            alert('Authentication error.');
            return false;
        }
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
                alert(`Failed to connect: ${JSON.stringify(result)}`);
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

    async function handleVerifyPinCode(formElement) {
        const submitButton = formElement.querySelector('button');
        const originalButtonText = submitButton.textContent;
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

            // --- THE CRITICAL FIX ---
            // If the server responds with a success status (200-299), we assume the PIN was correct.
            // If it was incorrect, the backend should have sent a 400 or other error status.
            if (response.ok) {
                return true;
            } else {
                // If the response is not okay, parse the error and alert the user.
                const errorResult = await response.json();
                alert(`PIN Verification Failed: ${errorResult.detail || JSON.stringify(errorResult)}`);
                return false;
            }
        } catch (error) {
            alert('Could not connect for PIN verification.');
            return false;
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
        const dataToSend = { username: username, pin_required: isRequired };
        try {
            const response = await fetch('https://emotuna-backend-production.up.railway.app/api/telegram/', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
                body: JSON.stringify(dataToSend)
            });
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    async function checkAgentStatus() {
        const accessToken = localStorage.getItem('accessToken');
        const username = localStorage.getItem('username');
        if (!accessToken || !username) return false;
        try {
            const response = await fetch(`https://emotuna-backend-production.up.railway.app/api/userbot/?username=${username}`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            if (!response.ok) return false;
            const result = await response.json();
            return result.running === true;
        } catch (error) {
            return false;
        }
    }

    // In script.js

    async function checkPinRequirement() {
        console.log("Checking PIN requirement status...");
        const accessToken = localStorage.getItem('accessToken');
        const username = localStorage.getItem('username');
        if (!accessToken || !username) return false;

        try {
            const response = await fetch(`https://emotuna-backend-production.up.railway.app/api/telegram/?username=${username}`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });

            if (!response.ok) {
                console.error(`Backend failed to provide PIN status. Status: ${response.status}`);
                return false;
            }

            // --- THIS IS THE CRITICAL FIX ---
            // Get the response as a single object.
            const result = await response.json();
            console.log("PIN requirement data from server:", result);

            // Directly check the 'pin_required' property on the object.
            // Also check that the result itself is not an empty array by mistake from the backend.
            if (Array.isArray(result) && result.length > 0) {
                // Handle the case where the backend *does* send an array
                return result[0].pin_required === true;
            } else if (result && typeof result === 'object' && !Array.isArray(result)) {
                // Handle the case where the backend sends a single object
                return result.pin_required === true;
            }

            // If the response is empty or in an unexpected format, assume no PIN is required.
            return false;

        } catch (error) {
            console.error("Network error while checking PIN requirement:", error);
            return false;
        }
    }

    // In script.js

    // In script.js

    // In script.js

    // This function is now the main controller for the entire agent start process.
    // This is now the main controller for the entire agent start process.
    // This function now correctly handles the 20-second delay.
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
        const pinIsRequired = await checkPinRequirement();

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

    // This function's ONLY job is to send the POST request to start the agent.
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
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify(requestData)
            });
            if (response.ok) {
                return true;
            } else {
                const error = await response.json();
                throw new Error(error.detail || JSON.stringify(error));
            }
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
        if (!accessToken || !username) {
            alert('Authentication error. Please log in again.');
            buttonElement.disabled = false;
            buttonElement.innerHTML = originalButtonContent;
            feather.replace();
            return false;
        }
        try {
            const response = await fetch('https://emotuna-backend-production.up.railway.app/api/userbot/', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
                body: JSON.stringify({ username: username })
            });
            if (response.ok || response.status === 500) {
                if (response.status === 500) {
                    console.warn("Server returned 500 on DELETE. Treating as success.");
                    alert("Agent has been instructed to stop.");
                } else {
                    const result = await response.json();
                    alert(`Agent status: ${result.status}`);
                }
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
    // In script.js



    async function handleFetchNotifications() {
        const listElement = document.getElementById('notification-list');
        const dotElement = document.querySelector('#notification-icon-wrapper .notification-dot');
        const panelElement = document.getElementById('notification-panel');

        // Silently exit if the elements aren't on the page
        if (!listElement || !dotElement || !panelElement) return;

        try {
            const accessToken = localStorage.getItem('accessToken');
            if (!accessToken) return;

            const response = await fetch('https://emotuna-backend-production.up.railway.app/api/notifications/', {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });

            if (!response.ok) {
                // Silently fail on polling, don't alert the user every time
                console.error(`Failed to fetch notifications: ${response.status}`);
                return;
            }

            const notifications = await response.json();

            // --- UI Logic ---
            const hasUnread = notifications.some(n => n.read === false);
            dotElement.classList.toggle('visible', hasUnread);

            // Only update the list if the panel is actually open
            if (panelElement.classList.contains('active')) {
                listElement.innerHTML = ''; // Clear the list
                if (notifications.length > 0) {
                    notifications.forEach(notif => {
                        const notifHTML = createNotificationHTML(notif); // Assuming this function exists
                        listElement.insertAdjacentHTML('beforeend', notifHTML);
                    });
                } else {
                    listElement.innerHTML = `<p class="empty-state">You have no notifications.</p>`;
                }
                feather.replace();
            }

        } catch (error) {
            console.error("Error during notification fetch:", error);
        }
    }
    /**
 * Downloads the user's SFT dataset from the backend.
 * @param {HTMLButtonElement} buttonElement - The download button for feedback.
 */
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
    /**
 * Uploads the user's selected SFT dataset to the backend.
 * @param {File} file - The file object selected by the user.
 * @param {HTMLButtonElement} buttonElement - The upload button for feedback.
 */
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
    /**
 * Sends a request to the backend to set the agent training status to "pending".
 * @param {HTMLButtonElement} buttonElement - The "Train Model" button for feedback.
 */
    // In script.js

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
                        //await createNotification("Training Complete", "Your self-trained model is now ready to be used.");

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
    // In script.js

    async function handleFetchMessages(category, messageListElement) {
        if (!messageListElement) return;
        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) return;

        if (!window.notifiedMessageIds) {
            window.notifiedMessageIds = new Set();
        }

        // The API query is now simplified since the backend doesn't filter.
        // We only ask for unreplied messages.
        const apiQuery = 'reply_sent=false';

        console.log(`Fetching ALL unreplied messages...`);
        if (messageListElement.children.length === 0) {
            messageListElement.innerHTML = `<p class="loading-state">Fetching messages...</p>`;
        }

        try {
            const response = await fetch(`https://emotuna-backend-production.up.railway.app/api/messages/?${apiQuery}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` }
            });

            if (response.status === 401) {
                alert("Your session has expired. Please log in again.");
                logout();
                return;
            }
            if (!response.ok) throw new Error(`Server responded with status: ${response.status}`);

            const allMessages = await response.json();

            // --- [THIS IS THE CRITICAL FIX: FRONTEND FILTERING] ---
            let filteredMessages;

            if (category === 'important') {
                filteredMessages = allMessages.filter(msg => msg.is_important === true);
            } else if (category === 'offensive') {
                filteredMessages = allMessages.filter(msg => msg.is_toxic === true);
            } else if (category === 'general') {
                filteredMessages = allMessages.filter(msg => msg.is_important === false && msg.is_toxic === false);
            } else {
                // Fallback in case of an unknown category
                filteredMessages = allMessages;
            }

            console.log(`Fetched ${allMessages.length} total, displaying ${filteredMessages.length} for category: ${category}`);

            // --- The rest of the logic now uses 'filteredMessages' instead of 'messages' ---

            const existingMessageIds = new Set([...messageListElement.querySelectorAll('.message-card')].map(card => card.dataset.messageId));
            const incomingMessageIds = new Set(filteredMessages.map(msg => String(msg.id)));

            let newMessagesFound = false;

            // Remove cards that are no longer in the filtered list
            existingMessageIds.forEach(id => {
                if (!incomingMessageIds.has(id)) {
                    const cardToRemove = messageListElement.querySelector(`[data-message-id="${id}"]`);
                    if (cardToRemove) {
                        cardToRemove.style.transition = 'opacity 0.3s ease';
                        cardToRemove.style.opacity = '0';
                        setTimeout(() => cardToRemove.remove(), 300);
                    }
                }
            });

            filteredMessages.forEach(msg => {
                if (!existingMessageIds.has(String(msg.id))) {
                    newMessagesFound = true;

                    // --- THIS IS THE CRITICAL FIX ---
                    // We must create a new object that maps the backend's field names
                    // to the field names that createInteractiveMessageCardHTML expects.
                    const formattedMessage = {
                        id: msg.id,
                        contact_username: msg.contact_username || 'Unknown',
                        timestamp: msg.timestamp,
                        message: msg.message,
                        sentiment: msg.sentiment,

                        // MAP a backend key 'ai_generated_message' to a frontend key 'reply_message'
                        reply_message: msg.ai_generated_message,

                        is_toxic: msg.is_toxic,
                        score: msg.score // Also pass the score for the history page
                    };

                    // Now, pass the NEW formatted object to the card generator.
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
                    //await createNotification("New Message Received", `You have new messages in the '${category}' category.`);
                    window.notifiedMessageIds.add(newestMessageId);
                }
            }

            if (messageListElement.querySelector('.loading-state')) {
                messageListElement.innerHTML = '';
            }
            if (messageListElement.children.length === 0) {
                messageListElement.innerHTML = `<p class="empty-state">No pending messages in this category.</p>`;
            }

            feather.replace();

        } catch (error) {
            console.error("Error fetching messages:", error);
            messageListElement.innerHTML = `<p class="error-state">Could not load messages.</p>`;
        }
    }

    function createInteractiveMessageCardHTML(msg) {
        // Determine card color based on sentiment
        const sentimentClass = msg.sentiment ? `sentiment-${msg.sentiment.toLowerCase()}` : 'sentiment-neutral';

        // --- [THIS IS THE FIX] ---
        // Check for 'reply_message', which is the key you are passing in from handleFetchMessages.
        const hasAiReply = msg.reply_message && msg.reply_message.trim() !== '';

        // Main AI Reply Block (either shows the AI reply or a "not generated" message)
        const aiReplyBlock = `
    <div class="ai-reply-header">
        <i data-feather="cpu"></i>
        <h4>AI Analysis</h4>
        ${msg.sentiment ? `<span class="sentiment-tag">${msg.sentiment}</span>` : ''}
    </div>
    <div class="ai-reply-body">
        ${hasAiReply ? `<p>${msg.reply_message}</p>` : `
            <div class="no-reply-message">
                <i data-feather="info"></i>
                <span>AI could not generate a reply for this message.</span>
            </div>
        `}
    </div>
    `;

        // Interaction Block (shows "Edit & Rate" if there's an AI reply, otherwise "Write your own")
        const interactionBlock = `
    <div class="interaction-area">
        ${hasAiReply ? `
            <!-- Edit & Rate Section -->
            <div class="interaction-header">Edit & Rate AI Reply</div>
            <textarea class="edit-reply-textarea" placeholder="Edit the AI reply here...">${msg.reply_message}</textarea>
            <div class="rating-input-group">
                <label for="score-${msg.id}">Rate Accuracy (0-100):</label>
                <input type="number" id="score-${msg.id}" class="score-input" min="0" max="100" value="100">
            </div>
        ` : `
            <!-- Write Your Own Section -->
            <div class="interaction-header">Write Your Own Reply</div>
            <textarea class="edit-reply-textarea" placeholder="Type your reply here..."></textarea>
        `}
        <button class="btn btn-primary btn-approve-send">
            <i data-feather="send"></i> Send Reply
        </button>
    </div>
    `;

        return `
    <div class="message-card glass-card ${sentimentClass}" data-message-id="${msg.id}">
        <div class="message-card-header">
            <div class="message-sender"><i data-feather="user"></i><span>${msg.contact_username || 'Unknown'}</span></div>
            <div class="message-timestamp">${new Date(msg.timestamp).toLocaleString()}</div>
        </div>
        <p class="message-content">${msg.message}</p>
        <div class="ai-reply-section">
            ${aiReplyBlock}
            ${interactionBlock}
        </div>
    </div>`;
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

    // In script.js

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
    // ======================================================
    // --- 3. THE MASTER INITIALIZATION & APP LOGIC ---
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

    // In script.js

    updateAgentUI = (state) => { // state can be 'stopped', 'connecting', or 'running'
        const agentStarter = document.getElementById('agent-starter');
        const agentChoice = document.getElementById('agent-choice');
        const agentActive = document.getElementById('agent-active');
        const messagesContainer = document.getElementById('messages-container');
        const stopAgentBtn = document.getElementById('stop-agent-btn');
        const statusSpan = agentActive ? agentActive.querySelector('span') : null;

        if (!agentStarter || !agentChoice || !agentActive || !messagesContainer || !stopAgentBtn || !statusSpan) {
            console.error("A UI element for agent state is missing.");
            return;
        }

        if (state === 'connecting') {
            agentStarter.style.display = 'none';
            agentChoice.style.display = 'none';
            messagesContainer.style.display = 'none'; // Hide messages
            statusSpan.textContent = 'Connecting...';
            stopAgentBtn.style.display = 'none'; // Hide stop button
            agentActive.style.display = 'flex';
        } else if (state === 'running') {
            agentStarter.style.display = 'none';
            agentChoice.style.display = 'none';
            statusSpan.textContent = 'Agent is Running';
            stopAgentBtn.style.display = 'inline-flex'; // Show stop button
            agentActive.style.display = 'flex';
            messagesContainer.style.display = 'block'; // Show messages
        } else { // 'stopped' state
            agentStarter.style.display = 'flex';
            agentChoice.style.display = 'none';
            agentActive.style.display = 'none';
            messagesContainer.style.display = 'none';
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

    function initializeApp() {
        console.log("Initializing App State...");

        // This MUST run before the routing logic to ensure navigation links
        // on the intro/login/signup pages are always functional.
        setupOnboardingListeners();

        const accessToken = localStorage.getItem('accessToken');
        const isFullyOnboarded = localStorage.getItem('isFullyOnboarded') === 'true';

        // This is now the ONLY place that decides which major view to show.
        if (accessToken && isFullyOnboarded) {
            switchView('main-app-wrapper');
            setupDashboard();
        } else if (accessToken) {
            switchView('platform-choice-wrapper');
        } else {
            // Default for all other cases (no token, etc.)
            switchView('intro-wrapper');
        }
    }

    // In script.js
    // In script.js

    async function setupDashboard() {
        console.log("--- Setting up Dashboard ---");

        // --- 1. FIND ALL ELEMENTS ---
        // Centralized lookup for all elements used within the dashboard.
        const uploadDataBtn = document.getElementById('upload-data-btn');
        const downloadDataBtn = document.getElementById('download-data-btn');
        const trainModelBtn = document.getElementById('train-model-btn');
        const fileUploadInput = document.getElementById('file-upload-input');
        const agentStarter = document.getElementById('agent-starter');
        const agentChoice = document.getElementById('agent-choice');
        const agentStarting = document.getElementById('agent-starting');
        const agentActive = document.getElementById('agent-active');
        const runAgentBtn = document.getElementById('run-agent-btn');
        const agentModelBtns = document.querySelectorAll('.agent-model-btn');
        const stopAgentBtn = document.getElementById('stop-agent-btn');
        const messagesContainer = document.getElementById('messages-container');
        const messageList = document.getElementById('message-list');
        const tabs = document.querySelectorAll('.message-tabs .tab-btn');
        const profileDropdown = document.getElementById('profile-dropdown');
        const notificationPanel = document.getElementById('notification-panel');
        const navRight = document.querySelector('.nav-right');
        const historyIcon = document.getElementById('history-icon');
        const backBtns = document.querySelectorAll('.back-btn');
        const settingsView = document.getElementById('settings-view');

        // --- 2. DEFINE ALL DASHBOARD-SCOPED HELPER FUNCTIONS ---

        // Assigns the main UI controller to the global variable
        updateAgentUI = (state) => {
            if (!agentStarter || !agentChoice || !agentStarting || !agentActive || !messagesContainer) {
                console.error("One or more agent UI elements are missing from the DOM.");
                return;
            }
            agentStarter.style.display = (state === 'stopped') ? 'flex' : 'none';
            agentChoice.style.display = 'none';
            agentStarting.style.display = (state === 'starting') ? 'flex' : 'none';
            agentActive.style.display = (state === 'running') ? 'flex' : 'none';
            messagesContainer.style.display = (state === 'running') ? 'block' : 'none';
        };

        pollForAgentStart = () => {
            if (agentStartPollingInterval) clearInterval(agentStartPollingInterval);
            const startupTimeout = setTimeout(() => {
                clearInterval(agentStartPollingInterval);
                alert("Agent failed to start within the time limit.");
                updateAgentUI('stopped');
            }, 35000);

            agentStartPollingInterval = setInterval(async () => {
                const isRunning = await checkAgentStatus();
                if (isRunning) {
                    clearInterval(agentStartPollingInterval);
                    clearTimeout(startupTimeout);
                    localStorage.setItem('agentIsRunning', 'true');
                    updateAgentUI('running');
                    //await createNotification("Agent Started", "Your AI agent is now running and monitoring messages.");
                    const lastActiveTab = localStorage.getItem('lastActiveTab') || 'important';
                    await handleFetchMessages(lastActiveTab, messageList);
                    startMessagePolling(messageList);

                }
            }, 5000);
        };

        const switchDashboardView = async (viewId) => {
            const subViews = ['dashboard-view', 'history-view', 'settings-view', 'privacy-view', 'about-us-view'];
            subViews.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.remove('active');
            });

            if (viewId === 'settings-view') {
                const userData = await handleFetchUserProfile();
                if (userData) populateSettingsForm(userData);
            } else if (viewId === 'history-view') {
                // When switching to the history view, fetch the history.
                await handleFetchHistory();
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

        // --- 3. GET INITIAL STATE BEFORE ATTACHING LISTENERS ---
        console.log("Checking initial agent status from backend...");
        const isAgentRunning = await checkAgentStatus();
        localStorage.setItem('agentIsRunning', isAgentRunning);
        console.log(`Backend reports agent is running: ${isAgentRunning}`);

        // --- 4. ATTACH ALL EVENT LISTENERS ---

        if (uploadDataBtn) uploadDataBtn.addEventListener('click', () => fileUploadInput.click());
        if (fileUploadInput) fileUploadInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) handleUploadData(file, uploadDataBtn);
            e.target.value = null;
        });

        if (downloadDataBtn) downloadDataBtn.addEventListener('click', (e) => handleDownloadData(e.target.closest('button')));
        if (trainModelBtn) trainModelBtn.addEventListener('click', (e) => handleRequestTraining(e.target.closest('button')));

        if (runAgentBtn) {
            runAgentBtn.addEventListener('click', () => {
                agentStarter.style.display = 'none';
                agentChoice.style.display = 'flex';
            });
        }



        if (stopAgentBtn) {
            stopAgentBtn.addEventListener('click', async (e) => {
                if (agentStartPollingInterval) clearInterval(agentStartPollingInterval);
                const success = await handleStopAgent(e.target.closest('button'));
                if (success) {
                    updateAgentUI('stopped');
                    stopMessagePolling();
                }
            });
        }

        if (tabs) {
            tabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    tabs.forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    const category = tab.dataset.category;
                    localStorage.setItem('lastActiveTab', category);
                    handleFetchMessages(category, messageList);
                });
            });
        }

        if (messageList) {
            messageList.addEventListener('click', async (e) => {
                if (e.target.closest('.btn-approve-send')) {
                    const messageCard = e.target.closest('.message-card');
                    if (messageCard) {
                        const success = await handleApproveAndSend(messageCard.dataset.messageId, messageCard);
                        if (success) {
                            messageCard.style.opacity = '0';
                            setTimeout(() => messageCard.remove(), 500);
                        }
                    }
                }
            });
        }

        if (historyIcon) historyIcon.addEventListener('click', () => switchDashboardView('history-view'));
        if (backBtns) backBtns.forEach(btn => btn.addEventListener('click', () => switchDashboardView(btn.dataset.targetView)));

        if (profileDropdown) {
            profileDropdown.addEventListener('click', (e) => {
                const item = e.target.closest('.dropdown-item');
                if (!item) return;
                if (item.id === 'logout-btn') {
                    e.preventDefault();
                    logout();
                    return;
                }
                if (item.dataset.targetView) {
                    switchDashboardView(item.dataset.targetView);
                    profileDropdown.classList.remove('active');
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
                    const success = await handleUpdateUserProfile({ username: newUsername });
                    if (success) {
                        document.getElementById('setting-username-display').textContent = newUsername;
                        toggleEditMode('username', false);
                    }
                }
                if (target.id === 'edit-email-btn') toggleEditMode('email', true);
                if (target.id === 'cancel-email-btn') toggleEditMode('email', false);
                if (target.id === 'save-email-btn') {
                    const newEmail = document.getElementById('setting-email-input').value;
                    const success = await handleUpdateUserProfile({ email: newEmail });
                    if (success) {
                        document.getElementById('setting-email-display').textContent = newEmail;
                        toggleEditMode('email', false);
                    }
                }
            });
        }

        if (navRight) {
            let hasFetchedInitialToggleState = false; // Flag to prevent re-fetching

            navRight.addEventListener('click', async (e) => {
                const wrapper = e.target.closest('.nav-icon-wrapper');
                if (!wrapper) return;

                e.stopPropagation();

                const profileDropdown = document.getElementById('profile-dropdown');
                const notificationPanel = document.getElementById('notification-panel');

                if (wrapper.id === 'profile-icon-wrapper') {
                    if (notificationPanel) notificationPanel.classList.remove('active');
                    const isActive = profileDropdown.classList.toggle('active');

                    // --- THIS IS THE FIX ---
                    // Fetch the initial state ONLY the very first time the dropdown is opened.
                    if (isActive && !hasFetchedInitialToggleState) {
                        const autoDmToggle = document.getElementById('auto-dm-toggle');
                        if (autoDmToggle) {
                            autoDmToggle.addEventListener('change', async () => {
                                const newIsEnabledState = autoDmToggle.checked;
                                autoDmToggle.disabled = true;

                                const success = await handleUpdateAutoReplyStatus(newIsEnabledState);

                                if (success) {
                                    // --- THIS IS THE FIX ---
                                    // If the backend update succeeds, update our local state variable.
                                    isAutoReplyEnabled = newIsEnabledState;
                                } else {
                                    // If the backend update failed, revert the toggle and the local state.
                                    autoDmToggle.checked = isAutoReplyEnabled; // Revert to the last known good state
                                }

                                autoDmToggle.disabled = false;
                            });
                        }
                    }
                }

                if (wrapper.id === 'notification-icon-wrapper') {
                    if (profileDropdown) profileDropdown.classList.remove('active');
                    const isActive = notificationPanel.classList.toggle('active');
                    if (isActive) {
                        handleFetchNotifications();
                    }
                }

                feather.replace();
            });
        }
        agentModelBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const selectedModel = btn.dataset.model;
                // The new handleRunAgent now controls the entire flow.
                handleRunAgent(selectedModel, btn);
            });
        });
        window.addEventListener('click', (e) => {
            const profileDropdown = document.getElementById('profile-dropdown');
            const notificationPanel = document.getElementById('notification-panel');

            // If the click was outside of the navRight area, close both dropdowns
            if (navRight && !navRight.contains(e.target)) {
                if (profileDropdown) profileDropdown.classList.remove('active');
                if (notificationPanel) notificationPanel.classList.remove('active');
            }
        });

        // --- 5. SET FINAL UI STATE AND FETCH DATA ---

        if (isAgentRunning) {
            updateAgentUI('running');
            console.log("Agent is running. Fetching initial messages...");
            const lastActiveTab = localStorage.getItem('lastActiveTab') || 'important';
            tabs.forEach(tab => tab.classList.toggle('active', tab.dataset.category === lastActiveTab));
            await handleFetchMessages(lastActiveTab, messageList);
            startMessagePolling(messageList);
            startNotificationPolling();
        } else {
            updateAgentUI('stopped');
            stopMessagePolling();         // <-- ADD THIS LINE
            stopNotificationPolling();
            console.log("Agent is stopped. Waiting for user action.");
        }

        switchDashboardView('dashboard-view'); // Ensure dashboard is the default view
        console.log("--- Dashboard setup complete ---");
    }
    // ===========================================
    // --- 4. STARTUP LOGIC ---
    // ===========================================

    function initializeApp() {
        console.log("Initializing App State...");

        // Get the loader element
        const loader = document.getElementById('app-loader');

        // Setup listeners for the unauthenticated pages first.
        setupOnboardingListeners();

        const accessToken = localStorage.getItem('accessToken');
        const isFullyOnboarded = localStorage.getItem('isFullyOnboarded') === 'true';

        // This is now the ONLY place that decides which major view to show.
        if (accessToken && isFullyOnboarded) {
            // For a returning, fully authenticated user
            switchView('main-app-wrapper');
            setupDashboard();
        } else if (accessToken) {
            // For a user who is logged in but hasn't finished onboarding
            switchView('platform-choice-wrapper');
        } else {
            // For a new visitor or logged-out user
            switchView('intro-wrapper');
        }

        // After the correct view is made active, hide the loader.
        if (loader) {
            loader.classList.add('hidden');
        }
    }

    initializeApp();
});