let currentChatId = localStorage.getItem('currentChatId') || null;
let chatHistories = JSON.parse(localStorage.getItem('chatHistories')) || {};

let speechRecognition = null;
let speechSynthesis = window.speechSynthesis;
let isSpeechEnabled = false;
let currentTheme = localStorage.getItem('theme') || 'light';
let currentModel = 'gemini'; // Default model
let isSidebarCollapsed = localStorage.getItem('isSidebarCollapsed') === 'true';

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const chatContainer = document.querySelector('.chat-container');
    isSidebarCollapsed = !isSidebarCollapsed;
    
    sidebar.classList.toggle('collapsed', isSidebarCollapsed);
    chatContainer.classList.toggle('expanded', isSidebarCollapsed);
    
    // Store the state in localStorage
    localStorage.setItem('isSidebarCollapsed', isSidebarCollapsed);
}

function loadChatHistory() {
    fetch('/get_chat_history')
        .then(response => response.json())
        .then(data => {
            if (Object.keys(data).length > 0) {
                chatHistories = data;
            } else {
                // If server returns empty, use local storage
                chatHistories = JSON.parse(localStorage.getItem('chatHistories')) || {};
            }
            localStorage.setItem('chatHistories', JSON.stringify(chatHistories));
            updateChatHistoryUI();
            
            // If no current chat is selected but we have chats, select the most recent one
            if (!currentChatId && Object.keys(chatHistories).length > 0) {
                const mostRecentChatId = Object.keys(chatHistories).sort().reverse()[0];
                loadChat(mostRecentChatId);
            } else if (currentChatId) {
                loadChat(currentChatId);
            }
        });
}

function updateChatHistoryUI() {
    const chatHistoryDiv = document.getElementById('chatHistory');
    chatHistoryDiv.innerHTML = '';
    
    Object.keys(chatHistories).reverse().forEach(chatId => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        if (chatId === currentChatId) {
            historyItem.classList.add('active');
        }
        // Get the first message or use default text
        const firstMessage = chatHistories[chatId][0]?.text || 'New Chat';
        const truncatedMessage = firstMessage.substring(0, 30) + (firstMessage.length > 30 ? '...' : '');
        historyItem.textContent = truncatedMessage;
        historyItem.onclick = () => loadChat(chatId);
        chatHistoryDiv.appendChild(historyItem);
    });
}

function loadChat(chatId) {
    currentChatId = chatId;
    localStorage.setItem('currentChatId', chatId);
    document.getElementById('chatMessages').innerHTML = '';
    
    if (chatHistories[chatId]) {
        chatHistories[chatId].forEach(msg => {
            addMessage(msg.text, msg.isUser);
        });
    }
    updateChatHistoryUI();
}

// Modify createNewChat to ensure clean state
function createNewChat() {
    fetch('/new_chat', {
        method: 'POST'
    })
    .then(response => response.json())
    .then(data => {
        currentChatId = data.chatId;
        localStorage.setItem('currentChatId', currentChatId);
        document.getElementById('chatMessages').innerHTML = '';
        loadChatHistory(); // Reload all chats to get the new one
    });
}

function addMessage(message, isUser = false) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`;
    messageDiv.textContent = message;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    if (currentChatId) {
        chatHistories[currentChatId] = chatHistories[currentChatId] || [];
        chatHistories[currentChatId].push({ text: message, isUser });
        localStorage.setItem('chatHistories', JSON.stringify(chatHistories));
    }

    // Add speech output for bot messages
    if (!isUser && isSpeechEnabled) {
        speakText(message);
    }
}

function initializeSpeechRecognition() {
    if ('webkitSpeechRecognition' in window) {
        speechRecognition = new webkitSpeechRecognition();
        speechRecognition.continuous = false;
        speechRecognition.interimResults = false;
        speechRecognition.lang = 'en-US';

        speechRecognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            document.getElementById('userInput').value = transcript;
            document.getElementById('sendButton').click();
        };

        speechRecognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            stopVoiceInput();
        };

        speechRecognition.onend = () => {
            stopVoiceInput();
        };
    } else {
        console.error('Speech recognition not supported');
    }
}

function toggleVoiceInput() {
    const voiceBtn = document.getElementById('voiceInputBtn');
    
    if (speechRecognition.running) {
        stopVoiceInput();
    } else {
        voiceBtn.classList.add('active');
        speechRecognition.start();
    }
}

function stopVoiceInput() {
    const voiceBtn = document.getElementById('voiceInputBtn');
    voiceBtn.classList.remove('active');
    if (speechRecognition) {
        speechRecognition.stop();
    }
}

function toggleSpeechOutput() {
    const speakBtn = document.getElementById('speakResponseBtn');
    isSpeechEnabled = !isSpeechEnabled;
    speakBtn.classList.toggle('active', isSpeechEnabled);
}

function splitTextIntoChunks(text, maxLength = 100) {
    const words = text.split(' ');
    const chunks = [];
    let currentChunk = '';

    words.forEach(word => {
        if ((currentChunk + ' ' + word).length <= maxLength) {
            currentChunk += (currentChunk ? ' ' : '') + word;
        } else {
            chunks.push(currentChunk);
            currentChunk = word;
        }
    });
    
    if (currentChunk) {
        chunks.push(currentChunk);
    }
    
    return chunks;
}

function speakText(text) {
    if (!isSpeechEnabled || !speechSynthesis) return;

    // Cancel any ongoing speech
    speechSynthesis.cancel();

    // Split text into smaller chunks
    const chunks = splitTextIntoChunks(text);
    let currentChunk = 0;

    function speakChunk() {
        if (currentChunk < chunks.length) {
            const utterance = new SpeechSynthesisUtterance(chunks[currentChunk]);
            
            // Get available voices
            const voices = speechSynthesis.getVoices();
            
            // Try to find a female English voice
            const femaleVoice = voices.find(voice => 
                voice.lang.startsWith('en-') && 
                voice.name.toLowerCase().includes('female')
            ) || 
            voices.find(voice => 
                voice.lang.startsWith('en-') && 
                (voice.name.toLowerCase().includes('samantha') || 
                 voice.name.toLowerCase().includes('victoria'))
            ) || 
            voices.find(voice => voice.lang.startsWith('en-')) || 
            voices[0];

            if (femaleVoice) {
                utterance.voice = femaleVoice;
            }

            // Configure speech parameters
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;

            // Only show speaking class for first chunk
            if (currentChunk === 0) {
                const speakBtn = document.getElementById('speakResponseBtn');
                speakBtn.classList.add('speaking');
            }

            utterance.onend = () => {
                currentChunk++;
                if (currentChunk < chunks.length) {
                    speakChunk();
                } else {
                    const speakBtn = document.getElementById('speakResponseBtn');
                    speakBtn.classList.remove('speaking');
                }
            };

            utterance.onerror = (event) => {
                console.error('Speech synthesis error:', event);
                const speakBtn = document.getElementById('speakResponseBtn');
                speakBtn.classList.remove('speaking');
            };

            speechSynthesis.speak(utterance);
        }
    }

    speakChunk();
}

// Add a function to initialize speech synthesis
function initializeSpeechSynthesis() {
    if ('speechSynthesis' in window) {
        // Load voices when they're available
        speechSynthesis.onvoiceschanged = () => {
            const voices = speechSynthesis.getVoices();
            console.log('Available voices:', voices.length);
        };
        
        // Force load voices
        speechSynthesis.getVoices();
    } else {
        console.error('Speech synthesis not supported');
        document.getElementById('speakResponseBtn').style.display = 'none';
    }
}

function initializeTheme() {
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeIcon();
}

function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem('theme', currentTheme);
    updateThemeIcon();
}

function updateThemeIcon() {
    const themeIcon = document.querySelector('#themeToggle .material-icons');
    themeIcon.textContent = currentTheme === 'light' ? 'dark_mode' : 'light_mode';
}

function handleToggleChange(e) {
    currentModel = e.target.checked ? 'azure' : 'gemini';
    document.getElementById('modelLabel').textContent = currentModel === 'gemini' ? 'Gemini' : 'Azure';
    console.log('Switched to:', currentModel); // Debug log
}

async function sendMessage(message) {
    if (!message.trim()) return;

    try {
        // Send the message to our backend which will handle the routing
        const response = await fetch('/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message,
                chatId: currentChatId,
                model: currentModel // Add the model type to the request
            })
        });
        
        const data = await response.json();
        if (data.error) {
            console.error('Error from server:', data.error);
            addMessage('Error: ' + data.error, false);
        } else {
            addMessage(data.response, false);
        }
    } catch (error) {
        console.error('Error:', error);
        addMessage(`Error: Could not get response from ${currentModel === 'gemini' ? 'Gemini' : 'Azure'}`, false);
    }
}

document.getElementById('sendButton').addEventListener('click', () => {
    const userInput = document.getElementById('userInput');
    const message = userInput.value.trim();
    
    if (message) {
        if (!currentChatId) {
            createNewChat();
        }
        
        addMessage(message, true);
        userInput.value = '';
        sendMessage(message);
    }
});

document.getElementById('userInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('sendButton').click();
    }
});

document.getElementById('newChat').addEventListener('click', createNewChat);

document.getElementById('fileUpload').addEventListener('change', async (e) => {
    if (e.target.files.length > 0) {
        const file = e.target.files[0];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('chatId', currentChatId);

        try {
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            
            if (response.ok) {
                addMessage(`File uploaded: ${file.name}`, true);
                // Add a system message suggesting to ask questions about the file
                addMessage(`You can now ask questions about the ${data.type}. What would you like to know?`, false);
            } else {
                addMessage(`Error uploading file: ${data.error}`, false);
            }
        } catch (error) {
            console.error('Error:', error);
            addMessage('Error uploading file. Please try again.', false);
        }
    }
});

document.getElementById('voiceInputBtn').addEventListener('click', toggleVoiceInput);
document.getElementById('speakResponseBtn').addEventListener('click', toggleSpeechOutput);
document.getElementById('themeToggle').addEventListener('click', toggleTheme);

// Add model toggle event listener
document.getElementById('modelToggle').addEventListener('change', handleToggleChange);

// Add this with other event listeners at the bottom
document.getElementById('sidebarToggle').addEventListener('click', toggleSidebar);

// Initialize by loading chat history
loadChatHistory();

// Initialize chat
if (!currentChatId) {
    createNewChat();
}

// Initialize speech recognition
initializeSpeechRecognition();

// Add this line near the bottom of the file with other initializations
initializeSpeechSynthesis();
initializeTheme();

// Initialize sidebar state
function initializeSidebar() {
    const savedState = localStorage.getItem('isSidebarCollapsed');
    if (savedState === 'true') {
        toggleSidebar();
    }
}

// Add this line near other initialization calls
initializeSidebar();
