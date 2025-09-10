document.addEventListener('DOMContentLoaded', () => {
    feather.replace();

    // --- DOM ELEMENTS ---
    const loginWrapper = document.getElementById('login-wrapper');
    const mainAppWrapper = document.getElementById('main-app-wrapper');
    const views = document.querySelectorAll('#main-app-wrapper .view'); // Select views inside the app
    const loginForm = document.getElementById('login-form');
    const messageList = document.getElementById('message-list');
    const tabs = document.querySelectorAll('.tab-btn');
    const fetchBtn = document.getElementById('fetch-messages-btn');
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

    // --- RICH MOCK DATA ---
    const allMessages = {
        important: [
            { id: 1, user: '@design_agency', content: 'Hi, we saw your profile and are very impressed. We have a potential client project we\'d like to discuss. Are you available for a quick call next week?', autoReply: 'collaboration inquiry', aiReply: { title: 'AI Professional Reply', text: 'Thank you for reaching out, I appreciate the kind words. I am definitely open to discussing new projects. Please let me know what time works best for you next week.', type: 'positive' } },
            { id: 2, user: '@event_planner', content: 'We are looking for speakers for our upcoming tech conference. Your expertise would be a perfect fit. Would you be interested?', autoReply: 'speaking opportunity', aiReply: { title: 'AI Interested Reply', text: 'That sounds like a wonderful opportunity. Could you please send over some more details about the conference, such as the date, location, and topic?', type: 'positive' } },
            { id: 3, user: '@startup_ceo', content: 'I\'m looking for a mentor in the marketing space and your journey is inspiring. Would you be open to a 15-minute virtual coffee chat?', autoReply: 'mentorship request', aiReply: { title: 'AI Gracious Reply', text: 'I\'m flattered you thought of me. My schedule is quite tight, but I\'d be happy to see if we can find a time. Please send me your availability.', type: 'positive' } },
        ],
        spam: [
            { id: 11, user: '@crypto_king', content: 'URGENT! Invest in SHIBAMOON now before it 1000x! Guaranteed returns, link in bio!! 🚀🚀', autoReply: '[SPAM DETECTED]', aiReply: { title: 'AI Spam Response', text: 'SPAM DETECTED: This message contains hallmarks of a financial scam. Recommended action: Block user and report. Do not click links.', type: 'spam' } },
            { id: 12, user: '@free_followers', content: 'Get 10,000 FREE followers instantly! No password needed, just click the link in our profile!', autoReply: '[SPAM DETECTED]', aiReply: { title: 'AI Spam Response', text: 'SPAM DETECTED: This is a common phishing attempt to gain access to your account. Recommended action: Block and report immediately.', type: 'spam' } },
            { id: 13, user: '@romance_bot', content: 'Hello dear, I saw your picture and was captivated by your beauty. I am a lonely princess from a foreign land...', autoReply: '[SPAM DETECTED]', aiReply: { title: 'AI Spam Response', text: 'SPAM DETECTED: This message matches patterns of romance scams. Recommended action: Block user. Do not engage or share personal information.', type: 'spam' } },
        ],
        offensive: [
            { id: 21, user: '@troll_master', content: 'Your content is trash and you have no talent. Why do people even follow you?', autoReply: '[OFFENSIVE CONTENT]', aiReply: { title: 'AI Professional Response', text: 'I appreciate you sharing your perspective. I focus on creating content that resonates with my community. I wish you all the best.', type: 'professional' } },
            { id: 22, user: '@angry_user', content: 'This is the worst advice I have ever seen. You should just delete your account.', autoReply: '[OFFENSIVE CONTENT]', aiReply: { title: 'AI Disarming Response', text: 'I\'m sorry to hear that my content didn\'t meet your expectations. I\'m always open to constructive feedback on how I can improve.', type: 'professional' } },
        ],
        newlyFetched: [
            { id: 31, user: '@podcast_host', content: 'Love your work! We\'d be thrilled to have you as a guest on our podcast, "Creative Minds".', autoReply: 'collaboration inquiry', category: 'important', aiReply: { title: 'AI Enthusiastic Reply', text: 'I\'m a big fan of "Creative Minds"! I would be absolutely honored to be a guest. Please let me know the next steps.', type: 'positive' } }
        ],
        loadMore: [
            { id: 41, user: '@supporter_22', content: 'Just wanted to say keep up the great work!', autoReply: 'positive feedback', category: 'important', aiReply: { title: 'AI Gracious Reply', text: 'That is so kind of you to say, thank you for your support! It means a lot.', type: 'positive' } },
            { id: 42, user: '@getrichquick', content: 'Do you want to be your own boss? Join my team and make 6 figures from your phone!', autoReply: '[SPAM DETECTED]', category: 'spam', aiReply: { title: 'AI Spam Response', text: 'SPAM DETECTED: This message matches patterns of a multi-level marketing scheme. Recommended action: Block user.', type: 'spam' } }
        ]
    };
    const historyData = [ { original: 'Great content!', reply: 'Thank you so much!', time: '2024-10-26 10:30 AM', reason: 'Positive sentiment detected. A simple, appreciative response is appropriate.', confidence: 98 }, { original: 'Can we work together?', reply: 'please let\'s collaborate', time: '2024-10-26 09:15 AM', reason: 'Collaboration intent keywords identified. AI suggests a direct positive response.', confidence: 95 }, ];
    const notificationsData = [ { icon: 'zap', title: 'Auto-DM mode is ON', time: '5m ago' }, { icon: 'shield', title: 'Blocked 3 spam accounts', time: '1h ago' }, { icon: 'message-square', title: 'Replied to @design_agency', time: '3h ago' } ];

    // --- MAIN APP LOGIC ---
    const switchView = (viewId) => {
        views.forEach(view => view.classList.remove('active'));
        const targetView = document.getElementById(viewId);
        if (targetView) {
            targetView.classList.add('active');
        }
        profileDropdown.classList.remove('active');
        notificationPanel.classList.remove('active');
    };
    
    // --- EVENT LISTENERS ---
    loginForm.addEventListener('submit', (e) => { 
        e.preventDefault(); 
        loginWrapper.classList.remove('active');
        mainAppWrapper.style.display = 'block';
        // A small delay to allow the display change before animating
        setTimeout(() => mainAppWrapper.classList.add('active'), 10);
        renderMessages('important'); 
    });

    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        mainAppWrapper.classList.remove('active');
        mainAppWrapper.style.display = 'none';
        loginWrapper.classList.add('active');
    });
    
    historyIcon.addEventListener('click', () => { renderHistory(); switchView('history-view'); });
    backBtns.forEach(btn => { btn.addEventListener('click', () => { switchView(btn.dataset.targetView); }); });
    profileDropdown.addEventListener('click', (e) => { const item = e.target.closest('.dropdown-item'); if (item && item.dataset.targetView) { e.preventDefault(); switchView(item.dataset.targetView); } });
    
    // All other event listeners are unchanged and correct
    const renderMessages = (category) => { messageList.innerHTML = ''; const messagesToRender = allMessages[category]; if (messagesToRender.length === 0) { messageList.innerHTML = `<p class="empty-state">No messages in this category.</p>`; return; } messagesToRender.forEach(msg => messageList.insertAdjacentHTML('beforeend', createMessageCardHTML(msg))); feather.replace(); };
    const toggleDropdown = (panel, otherPanels = []) => { otherPanels.forEach(p => p.classList.remove('active')); panel.classList.toggle('active'); };
    const renderNotifications = () => { notificationList.innerHTML = ''; notificationsData.forEach(n => { notificationList.innerHTML += `<div class="notification-item"><i data-feather="${n.icon}"></i><div class="notification-text"><span>${n.title}</span><small>${n.time}</small></div></div>`; }); feather.replace(); };
    const renderHistory = () => { historyList.innerHTML = ''; historyData.forEach(item => { historyList.innerHTML += `<div class="history-card glass-card"><div class="history-item"><div class="history-item-label">Original Message</div><p class="history-item-content quote">"${item.original}"</p></div><div class="history-item"><div class="history-item-label">AI Reply</div><p class="history-item-content">"${item.reply}"</p></div><div class="history-item"><div class="history-item-label">AI Reasoning</div><p class="history-item-content">${item.reason}</p></div><div class="history-item"><div class="history-item-label">Confidence</div><div class="confidence-meter"><div class="confidence-bar-bg"><div class="confidence-bar-fg" style="width: ${item.confidence}%;"></div></div><span class="confidence-percent">${item.confidence}%</span></div></div></div>`; }); };
    tabs.forEach(tab => { tab.addEventListener('click', () => { tabs.forEach(t => t.classList.remove('active')); tab.classList.add('active'); renderMessages(tab.dataset.category); }); });
    fetchBtn.addEventListener('click', () => { fetchBtn.innerHTML = '<i data-feather="loader"></i> Fetching...'; fetchBtn.querySelector('i').style.animation = 'spin 1s linear infinite'; feather.replace(); setTimeout(() => { if (allMessages.newlyFetched.length > 0) { const msg = allMessages.newlyFetched.pop(); allMessages[msg.category].unshift(msg); const activeTab = document.querySelector('.tab-btn.active').dataset.category; renderMessages(activeTab); } fetchBtn.innerHTML = '<i data-feather="check"></i> Fetched Successfully'; notificationDot.classList.add('active'); feather.replace(); }, 1500); });
    showMoreBtn.addEventListener('click', () => { if(allMessages.loadMore.length > 0) { const nextMessage = allMessages.loadMore.pop(); allMessages[nextMessage.category].push(nextMessage); const activeTab = document.querySelector('.tab-btn.active').dataset.category; renderMessages(activeTab); } if (allMessages.loadMore.length === 0) { showMoreBtn.style.display = 'none'; } });
    navRight.addEventListener('click', (e) => { const wrapper = e.target.closest('.nav-icon-wrapper'); if (!wrapper) return; if (wrapper.id === 'profile-icon-wrapper') { e.stopPropagation(); toggleDropdown(profileDropdown, [notificationPanel]); } if (wrapper.id === 'notification-icon-wrapper') { e.stopPropagation(); renderNotifications(); toggleDropdown(notificationPanel, [profileDropdown]); notificationDot.classList.remove('active'); } });
    profileDropdown.addEventListener('click', (e) => e.stopPropagation());
    notificationPanel.addEventListener('click', (e) => e.stopPropagation());
    window.addEventListener('click', () => { profileDropdown.classList.remove('active'); notificationPanel.classList.remove('active'); });
    messageList.addEventListener('click', (e) => { const target = e.target; if (target.closest('.expand-btn')) { const card = target.closest('.message-card'); const btn = target.closest('.expand-btn'); card.classList.toggle('expanded'); btn.classList.toggle('expanded'); btn.innerHTML = card.classList.contains('expanded') ? 'Collapse <i data-feather="chevron-up"></i>' : 'Expand <i data-feather="chevron-down"></i>'; feather.replace(); } if (target.closest('.btn-edit')) { const card = target.closest('.message-card'); const replyBody = card.querySelector('.ai-reply-body'); const actions = card.querySelector('.ai-reply-actions'); if (!replyBody.dataset.originalText) { replyBody.dataset.originalText = replyBody.innerHTML; } replyBody.contentEditable = true; replyBody.classList.add('is-editing'); replyBody.focus(); actions.innerHTML = `<button class="action-btn btn-cancel"><i data-feather="x"></i> Cancel</button><button class="action-btn btn-save"><i data-feather="check"></i> Save</button>`; feather.replace(); } if (target.closest('.btn-save')) { const card = target.closest('.message-card'); const replyBody = card.querySelector('.ai-reply-body'); const actions = card.querySelector('.ai-reply-actions'); replyBody.contentEditable = false; replyBody.classList.remove('is-editing'); replyBody.dataset.originalText = replyBody.innerHTML; const messageId = card.dataset.id; const message = [...Object.values(allMessages).flat()].find(m => m.id == messageId); actions.innerHTML = getActionButtonsHTML(message.aiReply.type); feather.replace(); } if (target.closest('.btn-cancel')) { const card = target.closest('.message-card'); const replyBody = card.querySelector('.ai-reply-body'); const actions = card.querySelector('.ai-reply-actions'); replyBody.innerHTML = replyBody.dataset.originalText; replyBody.contentEditable = false; replyBody.classList.remove('is-editing'); const messageId = card.dataset.id; const message = [...Object.values(allMessages).flat()].find(m => m.id == messageId); actions.innerHTML = getActionButtonsHTML(message.aiReply.type); feather.replace(); } });
    function createMessageCardHTML(message) { return `<div class="message-card glass-card" data-id="${message.id}"><div class="message-card-header"><div class="message-sender"><i data-feather="send" class="icon"></i><span>${message.user}</span></div><button class="btn expand-btn">Expand <i data-feather="chevron-down"></i></button></div><p class="message-content">${message.content}</p><div class="auto-reply"><strong>@auto message:</strong> ${message.autoReply}</div><div class="ai-reply-section"><div class="ai-reply-header"><h4>${message.aiReply.title}</h4><i data-feather="copy" class="nav-icon"></i></div><div class="ai-reply-body ${message.aiReply.type === 'spam' ? 'spam-alert' : ''}" data-original-text='${message.aiReply.text.replace(/'/g, "&apos;")}'>${message.aiReply.text}</div><div class="ai-reply-actions">${getActionButtonsHTML(message.aiReply.type)}</div></div></div>`; }
    function getActionButtonsHTML(type) { switch (type) { case 'spam': return `<button class="action-btn btn-report"><i data-feather="slash"></i> Report & Block</button>`; case 'professional': return `<button class="action-btn btn-edit"><i data-feather="edit-2"></i> Edit</button><button class="action-btn btn-respond"><i data-feather="send"></i> Send Response</button>`; default: return `<button class="action-btn btn-edit"><i data-feather="edit-2"></i> Edit</button><button class="action-btn btn-send"><i data-feather="send"></i> Send Reply</button>`; } }
});