const textDisplay = document.getElementById('text-display');
const configPanel = document.getElementById('config-panel');
const randomCharsToggle = document.getElementById('random-chars-toggle');
const wpmDisplay = document.getElementById('wpm');
const cpsDisplay = document.getElementById('cps');
let currentText = '';
let currentIndex = 0;
let lastTypedTime = Date.now();
let configTimeout;
let typingHistory = [];
let resetTimeout;
let timerInterval;
let timeLeft;
let isTimedMode = false;

function generateRandomText(useRandomChars = false, length = 100) {
    if (useRandomChars) {
        const chars = 'abcdefghijklmnopqrstuvwxyz';
        return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    } else {
        const words = ['the', 'quick', 'brown', 'fox', 'jumps', 'over', 'lazy', 'dog', 'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit'];
        return Array.from({ length: Math.ceil(length / 5) }, () => words[Math.floor(Math.random() * words.length)]).join(' ');
    }
}

function updateDisplay() {
    const displayText = currentText.split('').map((char, index) => {
        if (index < currentIndex) {
            return `<span class="correct">${char}</span>`;
        } else if (index === currentIndex) {
            return `<span class="current">${char}</span>`;
        } else {
            return `<span class="future">${char}</span>`;
        }
    }).join('');
    textDisplay.innerHTML = displayText;
    
    const currentChar = textDisplay.querySelector('.current');
    if (currentChar) {
        const containerWidth = textDisplay.offsetWidth;
        const charPosition = currentChar.offsetLeft + (currentChar.offsetWidth / 2);
        const offset = charPosition - (containerWidth / 2);
        textDisplay.style.transform = `translate(calc(-50% - ${offset}px), -50%)`;
    }
}

function newText() {
    currentText = generateRandomText(randomCharsToggle.checked, 200);
    currentIndex = 0;
    updateDisplay();
    resetSpeedTest();
}

function showConfigPanel() {
    configPanel.style.opacity = '1';
}

function hideConfigPanel() {
    configPanel.style.opacity = '0';
}

function resetSpeedTest() {
    typingHistory = [];
    wpmDisplay.textContent = '0';
    cpsDisplay.textContent = '0.00';
}

function updateStats() {
    const currentTime = Date.now();
    
    if (!isTimedMode && currentTime - lastTypedTime >= 2000) {
        resetSpeedTest();
        return;
    }
    
    const recentHistory = typingHistory.filter(entry => currentTime - entry.time <= 30000);
    
    if (recentHistory.length === 0) {
        wpmDisplay.textContent = '0';
        cpsDisplay.textContent = '0.00';
        return;
    }
    
    const oldestEntryTime = recentHistory[0].time;
    const elapsedMinutes = (currentTime - oldestEntryTime) / 60000;
    const charactersTyped = recentHistory.reduce((sum, entry) => sum + entry.characters, 0);
    
    const words = charactersTyped / 5;
    const wpm = Math.round(words / elapsedMinutes);
    const cps = (charactersTyped / (elapsedMinutes * 60)).toFixed(2);

    wpmDisplay.textContent = wpm;
    cpsDisplay.textContent = cps;
}

function startTimedMode(duration) {
    isTimedMode = true;
    timeLeft = duration;
    document.getElementById('timer').style.display = 'block';
    updateTimerDisplay();
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            endTimedMode();
        }
    }, 1000);
    typingHistory = []; // Reset typing history at the start of timed mode
    updateStats(); // Initialize stats display
}

function updateTimerDisplay() {
    document.getElementById('time-left').textContent = timeLeft;
}

function endTimedMode() {
    isTimedMode = false;
    document.getElementById('timer').style.display = 'none';
    showResults();
}

function showResults() {
    const finalWpm = wpmDisplay.textContent;
    const finalCps = cpsDisplay.textContent;
    const finalChars = typingHistory.reduce((sum, entry) => sum + entry.characters, 0);

    document.getElementById('final-wpm').textContent = finalWpm;
    document.getElementById('final-cps').textContent = finalCps;
    document.getElementById('final-chars').textContent = finalChars;

    document.getElementById('results-popup').style.display = 'flex';
}

document.addEventListener('keydown', (e) => {
    if (e.key === currentText[currentIndex]) {
        currentIndex++;
        typingHistory.push({ time: Date.now(), characters: 1 });
        updateDisplay();
        lastTypedTime = Date.now();
        hideConfigPanel();
        clearTimeout(configTimeout);
        
        if (currentIndex >= currentText.length - 50) {
            currentText += generateRandomText(randomCharsToggle.checked, 100);
        }
        
        if (!isTimedMode) {
            clearTimeout(resetTimeout);
            resetTimeout = setTimeout(resetSpeedTest, 2000);
        }
    }
    
    // Prevent space from activating buttons or checkboxes
    if (e.key === ' ' && (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT')) {
        e.preventDefault();
    }
    
    if (!isTimedMode) {
        configTimeout = setTimeout(() => {
            if (Date.now() - lastTypedTime >= 1000) {
                showConfigPanel();
            }
        }, 1000);
    }
});

randomCharsToggle.addEventListener('change', (e) => {
    if (e.isTrusted) {
        newText();
    } else {
        randomCharsToggle.checked = !randomCharsToggle.checked;
    }
});

document.querySelectorAll('input[name="mode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        if (!e.isTrusted) {
            e.preventDefault();
            return;
        }
        const timeSelect = document.getElementById('time-select');
        const customTime = document.getElementById('custom-time');
        if (e.target.value === 'timed') {
            timeSelect.disabled = false;
            customTime.disabled = timeSelect.value !== 'custom';
        } else {
            timeSelect.disabled = true;
            customTime.disabled = true;
        }
    });
});

document.getElementById('time-select').addEventListener('change', (e) => {
    if (!e.isTrusted) {
        e.preventDefault();
        return;
    }
    const customTime = document.getElementById('custom-time');
    customTime.disabled = e.target.value !== 'custom';
});

document.getElementById('start-button').addEventListener('click', (e) => {
    if (!e.isTrusted) {
        return;
    }
    const mode = document.querySelector('input[name="mode"]:checked').value;
    if (mode === 'infinite') {
        isTimedMode = false;
        newText();
    } else {
        const timeSelect = document.getElementById('time-select');
        const customTime = document.getElementById('custom-time');
        let duration = parseInt(timeSelect.value);
        if (timeSelect.value === 'custom') {
            duration = parseInt(customTime.value);
        }
        newText();
        startTimedMode(duration);
    }
    hideConfigPanel();
});

document.getElementById('close-popup').addEventListener('click', (e) => {
    if (!e.isTrusted) {
        return;
    }
    document.getElementById('results-popup').style.display = 'none';
    showConfigPanel();
});

// Prevent space from triggering button clicks
document.querySelectorAll('button').forEach(button => {
    button.addEventListener('keydown', (e) => {
        if (e.key === ' ') {
            e.preventDefault();
        }
    });
});

setInterval(updateStats, 1000);

newText();
showConfigPanel();
