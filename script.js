document.addEventListener('DOMContentLoaded', () => {
    feather.replace();

   
    const introWrapper = document.getElementById('intro-wrapper');
    const signupWrapper = document.getElementById('signup-wrapper');
    const loginWrapper = document.getElementById('login-wrapper');

   
    const getStartedBtn = document.getElementById('get-started-btn');
    const signupNextBtn = document.getElementById('signup-next-btn');
    const goToLoginLink = document.getElementById('go-to-login-link');
    const goToSignupLink = document.getElementById('go-to-signup-link');
    const loginForm = document.getElementById('login-form');
    const telegramConnectWrapper = document.getElementById('telegram-connect-wrapper');
    const pinCodeWrapper = document.getElementById('pin-code-wrapper');
    const backToSignup1Link = document.getElementById('back-to-signup1-link');
    const sendCodeBtn = document.getElementById('send-code-btn'); // New
    const verifyPinBtn = document.getElementById('verify-pin-btn'); // New
    // In script.js, near the top with your other const declarations
    const agentStarter = document.getElementById('agent-starter');
    const agentChoice = document.getElementById('agent-choice');
    const messagesContainer = document.getElementById('messages-container');
    const runAgentBtn = document.getElementById('run-agent-btn');
    const agentModelBtns = document.querySelectorAll('.agent-model-btn');

    // Main App Wrapper
    const mainAppWrapper = document.getElementById('main-app-wrapper');

    // All other elements for the main app
    const views = document.querySelectorAll('#main-app-wrapper .view');
    const messageList = document.getElementById('message-list');
    const tabs = document.querySelectorAll('.tab-btn');
    const showMoreBtn = document.getElementById('show-more-btn');
    const notificationIconWrapper = document.getElementById('notification-icon-wrapper');
    const notificationDot = document.querySelector('.notification-dot');
    const notificationPanel = document.getElementById('notification-panel');
    const notificationList = document.getElementById('notification-list');
    const profileDropdown = document.getElementById('profile-dropdown');
    const navRight = document.querySelector('.nav-right');
    const historyIcon = document.getElementById('history-icon');
    const backBtns = document.querySelectorAll('.back-btn');
    const historyList = document.getElementById('history-list');
    const logoutBtn = document.getElementById('logout-btn');
    const uploadDataBtn = document.getElementById('upload-data-btn');
    const downloadDataBtn = document.getElementById('download-data-btn');
    const trainModelBtn = document.getElementById('train-model-btn');
    const switchOnboardingView = (viewToShow) => {
        // Hide all views first
        [introWrapper, signupWrapper, telegramConnectWrapper, pinCodeWrapper, loginWrapper].forEach(view => {
            view.classList.remove('active');
        });
        // Show the target view
        if (viewToShow) {
            viewToShow.classList.add('active');
        }
    };
    // --- RICH MOCK DATA ---
    const allMessages = {
        important: [
            { id: 1, user: '@design_agency', content: 'Hi, we saw your profile and are very impressed. We have a potential client project we\'d like to discuss. Are you available for a quick call next week?', autoReply: 'collaboration inquiry', aiReply: { title: 'AI Professional Reply', text: 'Thank you for reaching out, I appreciate the kind words. I am definitely open to discussing new projects. Please let me know what time works best for you next week.', type: 'positive' } },
            { id: 2, user: '@event_planner', content: 'We are looking for speakers for our upcoming tech conference. Your expertise would be a perfect fit. Would you be interested?', autoReply: 'speaking opportunity', aiReply: { title: 'AI Interested Reply', text: 'That sounds like a wonderful opportunity. Could you please send over some more details about the conference, such as the date, location, and topic?', type: 'positive' } },
        ],
        spam: [
            { id: 11, user: '@crypto_king', content: 'URGENT! Invest in SHIBAMOON now before it 1000x! Guaranteed returns, link in bio!! 🚀🚀', autoReply: '[SPAM DETECTED]', aiReply: { title: 'AI Spam Response', text: 'SPAM DETECTED: This message contains hallmarks of a financial scam. Recommended action: Block user and report. Do not click links.', type: 'spam' } },
            { id: 12, user: '@free_followers', content: 'Get 10,000 FREE followers instantly! No password needed, just click the link in our profile!', autoReply: '[SPAM DETECTED]', aiReply: { title: 'AI Spam Response', text: 'SPAM DETECTED: This is a common phishing attempt to gain access to your account. Recommended action: Block and report immediately.', type: 'spam' } },
        ],
        offensive: [
            { id: 21, user: '@troll_master', content: 'Your content is trash and you have no talent. Why do people even follow you?', autoReply: '[OFFENSIVE CONTENT]', aiReply: { title: 'AI Professional Response', text: 'I appreciate you sharing your perspective. I focus on creating content that resonates with my community. I wish you all the best.', type: 'professional' } },
        ],
        loadMore: [
            { id: 41, user: '@supporter_22', content: 'Just wanted to say keep up the great work!', autoReply: 'positive feedback', category: 'important', aiReply: { title: 'AI Gracious Reply', text: 'That is so kind of you to say, thank you for your support! It means a lot.', type: 'positive' } },
        ]
    };
    const historyData = [{ original: 'Great content!', reply: 'Thank you so much!', time: '2024-10-26 10:30 AM', reason: 'Positive sentiment detected. A simple, appreciative response is appropriate.', confidence: 98 }, { original: 'Can we work together?', reply: 'please let\'s collaborate', time: '2024-10-26 09:15 AM', reason: 'Collaboration intent keywords identified. AI suggests a direct positive response.', confidence: 95 },];
    const notificationsData = [{ icon: 'zap', title: 'Auto-DM mode is ON', time: '5m ago' }, { icon: 'shield', title: 'Blocked 3 spam accounts', time: '1h ago' }, { icon: 'message-square', title: 'Replied to @design_agency', time: '3h ago' }];

    // --- ONBOARDING & LOGIN FLOW ---
    // --- ONBOARDING & LOGIN FLOW (CORRECTED MULTI-STEP LOGIC) ---

    // Helper function to switch between onboarding views



    // Set the initial state when the page loads: only intro is visible
    switchOnboardingView(introWrapper);


    // --- EVENT LISTENERS FOR THE ENTIRE FLOW ---

    // 1. "Get Started" button (Intro -> Sign Up Step 1)
    getStartedBtn.addEventListener('click', () => {
        switchOnboardingView(signupWrapper);
    });

    // 2. "Next" button (Sign Up Step 1 -> Sign Up Step 2)
    signupNextBtn.addEventListener('click', () => {
        // This is the line that needed to be fixed.
        // It now correctly goes to the telegram-connect screen.
        switchOnboardingView(telegramConnectWrapper);
    });

    // 3. "Send Code" button (Sign Up Step 2 -> Sign Up Step 3)
    sendCodeBtn.addEventListener('click', () => {
        // --- BACKEND CONNECTION POINT ---
        // In a real app, you would send API ID, Hash, and Phone to your server here.
        console.log("Simulating API request to send verification code...");

        // After the request, move to the PIN entry screen.
        switchOnboardingView(pinCodeWrapper);
    });

    // 4. "Verify & Finish" button (Sign Up Step 3 -> Main App)
    verifyPinBtn.addEventListener('click', () => {
        // --- BACKEND CONNECTION POINT ---
        // In a real app, you would send the PIN to your server for verification.
        console.log("Simulating PIN verification...");

        // On success, hide all onboarding views and show the main app.
        switchOnboardingView(null); // This hides all onboarding screens.
        mainAppWrapper.classList.add('active');
        resetDashboard();
        // Load initial dashboard data.
    });

    // --- Navigation Links ---

    // "Go Back" link (Step 2 -> Step 1)
    backToSignup1Link.addEventListener('click', (e) => {
        e.preventDefault();
        switchOnboardingView(signupWrapper);
    });

    // "Already have an account? Login" link
    goToLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        switchOnboardingView(loginWrapper);
    });

    // "Don't have an account? Sign Up" link
    goToSignupLink.addEventListener('click', (e) => {
        e.preventDefault();
        switchOnboardingView(signupWrapper);
    });

    // --- Standard Login and Logout ---

    // This handles the separate login form submission
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        switchOnboardingView(null); // Hide all onboarding screens
        mainAppWrapper.classList.add('active');
        resetDashboard();
    });

    // This handles the logout button
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        mainAppWrapper.classList.remove('active');
        switchOnboardingView(introWrapper); // Go back to the very first screen
    });

    // --- HTML Recommendation ---
    // Make sure your main app wrapper in index.html looks like this:
    // <div id="main-app-wrapper" class="view">
    // This ensures it's hidden by default along with the other views.

    // Finally, make sure the mainAppWrapper is also treated as a view
    // and is hidden initially.
    // In your HTML: change <div id="main-app-wrapper" style="display: none;">
    // To: <div id="main-app-wrapper" class="view">
    // This lets your CSS control everything.
    // --- MAIN APP LOGIC & NAVIGATION ---
    const switchView = (viewId) => {
        views.forEach(view => view.classList.remove('active'));
        const targetView = document.getElementById(viewId);
        if (targetView) targetView.classList.add('active');
        profileDropdown.classList.remove('active');
        notificationPanel.classList.remove('active');
    };

    historyIcon.addEventListener('click', () => { renderHistory(); switchView('history-view'); });
    backBtns.forEach(btn => { btn.addEventListener('click', () => { switchView(btn.dataset.targetView); }); });
    profileDropdown.addEventListener('click', (e) => { const item = e.target.closest('.dropdown-item'); if (item && item.dataset.targetView) { e.preventDefault(); switchView(item.dataset.targetView); } });

    // --- DASHBOARD EVENT LISTENERS ---
    tabs.forEach(tab => { tab.addEventListener('click', () => { tabs.forEach(t => t.classList.remove('active')); tab.classList.add('active'); renderMessages(tab.dataset.category); }); });

    uploadDataBtn.addEventListener('click', () => alert('Upload Data button clicked!'));
    downloadDataBtn.addEventListener('click', () => alert('Download Data button clicked!'));
    trainModelBtn.addEventListener('click', () => alert('Train Model button clicked!'));

    showMoreBtn.addEventListener('click', () => { if (allMessages.loadMore.length > 0) { const nextMessage = allMessages.loadMore.pop(); allMessages[nextMessage.category].push(nextMessage); const activeTab = document.querySelector('.tab-btn.active').dataset.category; renderMessages(activeTab); } if (allMessages.loadMore.length === 0) { showMoreBtn.style.display = 'none'; } });

    navRight.addEventListener('click', (e) => { const wrapper = e.target.closest('.nav-icon-wrapper'); if (!wrapper) return; if (wrapper.id === 'profile-icon-wrapper') { e.stopPropagation(); toggleDropdown(profileDropdown, [notificationPanel]); } if (wrapper.id === 'notification-icon-wrapper') { e.stopPropagation(); renderNotifications(); toggleDropdown(notificationPanel, [profileDropdown]); notificationDot.classList.remove('active'); } });

    profileDropdown.addEventListener('click', (e) => e.stopPropagation());
    notificationPanel.addEventListener('click', (e) => e.stopPropagation());
    window.addEventListener('click', () => { profileDropdown.classList.remove('active'); notificationPanel.classList.remove('active'); });

    messageList.addEventListener('click', (e) => {
        const target = e.target;
        if (target.closest('.expand-btn')) { const card = target.closest('.message-card'); const btn = target.closest('.expand-btn'); card.classList.toggle('expanded'); btn.classList.toggle('expanded'); btn.innerHTML = card.classList.contains('expanded') ? 'Collapse <i data-feather="chevron-up"></i>' : 'Expand <i data-feather="chevron-down"></i>'; feather.replace(); }
        if (target.closest('.btn-edit')) { const card = target.closest('.message-card'); const replyBody = card.querySelector('.ai-reply-body'); const actions = card.querySelector('.ai-reply-actions'); if (!replyBody.dataset.originalText) { replyBody.dataset.originalText = replyBody.innerHTML; } replyBody.contentEditable = true; replyBody.classList.add('is-editing'); replyBody.focus(); actions.innerHTML = `<button class="action-btn btn-cancel"><i data-feather="x"></i> Cancel</button><button class="action-btn btn-save"><i data-feather="check"></i> Save</button>`; feather.replace(); }
        if (target.closest('.btn-save')) { const card = target.closest('.message-card'); const replyBody = card.querySelector('.ai-reply-body'); const actions = card.querySelector('.ai-reply-actions'); replyBody.contentEditable = false; replyBody.classList.remove('is-editing'); replyBody.dataset.originalText = replyBody.innerHTML; const messageId = card.dataset.id; const message = [...Object.values(allMessages).flat()].find(m => m && m.id == messageId); actions.innerHTML = getActionButtonsHTML(message.aiReply.type); feather.replace(); }
        if (target.closest('.btn-cancel')) { const card = target.closest('.message-card'); const replyBody = card.querySelector('.ai-reply-body'); const actions = card.querySelector('.ai-reply-actions'); replyBody.innerHTML = replyBody.dataset.originalText; replyBody.contentEditable = false; replyBody.classList.remove('is-editing'); const messageId = card.dataset.id; const message = [...Object.values(allMessages).flat()].find(m => m && m.id == messageId); actions.innerHTML = getActionButtonsHTML(message.aiReply.type); feather.replace(); }
    });


    // In script.js, add this new logic, for example after the login/logout listeners

// When the "Run Agent" button is clicked...
runAgentBtn.addEventListener('click', () => {
    // Hide the starter and show the model choices
    agentStarter.style.display = 'none';
    agentChoice.style.display = 'flex';
});

// When EITHER of the model choice buttons is clicked...
agentModelBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const selectedModel = btn.dataset.model;
        console.log(`Agent starting with model: ${selectedModel}`);

        // --- BACKEND CONNECTION POINT ---
        // This is where you would make a fetch() call to your backend,
        // telling it which model to use to process the messages.
        // For example: fetch(`/api/run-agent?model=${selectedModel}`)

        // For now, we just simulate success:
        
        // 1. Hide the choice container
        agentChoice.style.display = 'none';
        
        // 2. Show the messages container
        messagesContainer.style.display = 'block';
        
        // 3. Render the messages, starting with the 'important' tab
        renderMessages('important');

        // 4. Re-initialize Feather Icons if any new ones were added
        feather.replace();
    });
});

    // --- HELPER FUNCTIONS ---
    const toggleDropdown = (panel, otherPanels = []) => { otherPanels.forEach(p => p.classList.remove('active')); panel.classList.toggle('active'); };
    const renderNotifications = () => { notificationList.innerHTML = ''; notificationsData.forEach(n => { notificationList.innerHTML += `<div class="notification-item"><i data-feather="${n.icon}"></i><div class="notification-text"><span>${n.title}</span><small>${n.time}</small></div></div>`; }); feather.replace(); };
    const renderHistory = () => { historyList.innerHTML = ''; historyData.forEach(item => { historyList.innerHTML += `<div class="history-card glass-card"><div class="history-item"><div class="history-item-label">Original Message</div><p class="history-item-content quote">"${item.original}"</p></div><div class="history-item"><div class="history-item-label">AI Reply</div><p class="history-item-content">"${item.reply}"</p></div><div class="history-item"><div class="history-item-label">AI Reasoning</div><p class="history-item-content">${item.reason}</p></div><div class="history-item"><div class="history-item-label">Confidence</div><div class="confidence-meter"><div class="confidence-bar-bg"><div class="confidence-bar-fg" style="width: ${item.confidence}%;"></div></div><span class="confidence-percent">${item.confidence}%</span></div></div></div>`; }); feather.replace(); };
    const renderMessages = (category) => {
        messageList.innerHTML = '';
        const messagesToRender = allMessages[category];
        if (!messagesToRender || messagesToRender.length === 0) {
            messageList.innerHTML = `<p class="empty-state">No messages in this category.</p>`;
            return;
        }
        messagesToRender.forEach(msg => messageList.insertAdjacentHTML('beforeend', createMessageCardHTML(msg)));
        feather.replace();
    };
    function createMessageCardHTML(message) { return `<div class="message-card glass-card" data-id="${message.id}"><div class="message-card-header"><div class="message-sender"><i data-feather="send" class="icon"></i><span>${message.user}</span></div><button class="btn expand-btn">Expand <i data-feather="chevron-down"></i></button></div><p class="message-content">${message.content}</p><div class="auto-reply"><strong>@auto message:</strong> ${message.autoReply}</div><div class="ai-reply-section"><div class="ai-reply-header"><h4>${message.aiReply.title}</h4><i data-feather="copy" class="nav-icon"></i></div><div class="ai-reply-body ${message.aiReply.type === 'spam' ? 'spam-alert' : ''}" data-original-text='${message.aiReply.text.replace(/'/g, "&apos;")}'>${message.aiReply.text}</div><div class="ai-reply-actions">${getActionButtonsHTML(message.aiReply.type)}</div></div></div>`; }
    function getActionButtonsHTML(type) { switch (type) { case 'spam': return `<button class="action-btn btn-report"><i data-feather="slash"></i> Report & Block</button>`; case 'professional': return `<button class="action-btn btn-edit"><i data-feather="edit-2"></i> Edit</button><button class="action-btn btn-respond"><i data-feather="send"></i> Send Response</button>`; default: return `<button class="action-btn btn-edit"><i data-feather="edit-2"></i> Edit</button><button class="action-btn btn-send"><i data-feather="send"></i> Send Reply</button>`; } }
});