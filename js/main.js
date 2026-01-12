/**
 * 906.sh - Main JavaScript
 * Terminal, clock, theme switching, and utilities
 */

// ========== CLOCK ==========
function updateClock() {
    const now = new Date();
    const timeEl = document.getElementById('clock-time');
    const dateEl = document.getElementById('clock-date');

    if (timeEl) {
        timeEl.textContent = now.toLocaleTimeString('en-US', { hour12: false });
    }
    if (dateEl) {
        dateEl.textContent = now.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
}

// Initialize clock if elements exist
if (document.getElementById('clock-time')) {
    updateClock();
    setInterval(updateClock, 1000);
}

// ========== TERMINAL ==========
const fileSystem = {
    '/': {
        type: 'dir',
        children: ['home', 'projects', 'docs']
    },
    '/home': {
        type: 'dir',
        children: ['about.txt', 'notes.txt']
    },
    '/home/about.txt': {
        type: 'file',
        content: 'Developer from the 906 (Upper Peninsula of Michigan).\nBuilding tools, shipping code, drinking coffee.'
    },
    '/home/notes.txt': {
        type: 'file',
        content: 'TODO: Ship more features\nTODO: Drink more coffee\nTODO: Touch grass occasionally'
    },
    '/projects': {
        type: 'dir',
        children: ['906sh.md', 'northernwisp.md', '906care.md', 'deltacounty.md', 'dailydelta.md']
    },
    '/projects/906sh.md': {
        type: 'file',
        content: '# 906.sh\nParent company encapsulating all ventures.\nBuilt with vanilla HTML, CSS, and JavaScript.'
    },
    '/projects/northernwisp.md': {
        type: 'file',
        content: '# NorthernWISP\nEducational sector for open-source self-hosting.\nIntroduction to the digital landscape.'
    },
    '/projects/906care.md': {
        type: 'file',
        content: '# 906Care\nHCBS management platform for clients, caregivers, billing, EVV, reporting, audit trails, and compliance.'
    },
    '/projects/deltacounty.md': {
        type: 'file',
        content: '# DeltaCounty.Services\nAIO landing pages for local businesses.\nPerfect for farmers market vendors!'
    },
    '/projects/dailydelta.md': {
        type: 'file',
        content: '# DailyDelta.org\nThe new-age newspaper of Delta County.\nFocused on Escanaba and the UP.'
    },
    '/docs': {
        type: 'dir',
        children: ['readme.md', 'tech-stack.md']
    },
    '/docs/readme.md': {
        type: 'file',
        content: '# Documentation\nWelcome to the 906.sh documentation.\nType "help" for available commands.'
    },
    '/docs/tech-stack.md': {
        type: 'file',
        content: '# Tech Stack\nProxmox, Docker, Linux, Windows\nZitadel, Passbolt, Zoraxy\nFrappe, Plane, OnlyOffice'
    }
};

let currentPath = '/home';
let commandHistory = [];
let historyIndex = -1;

const commands = {
    help: () => `Available commands:
  ls          - list directory
  cd <dir>    - change directory  
  pwd         - print working directory
  cat <file>  - read file
  clear       - clear terminal
  whoami      - display user
  date        - show date
  echo <msg>  - print message
  uname       - system info`,

    ls: () => {
        const dir = fileSystem[currentPath];
        return dir ? dir.children.join('  ') : 'Directory not found';
    },

    pwd: () => currentPath,

    cd: (args) => {
        const target = args[0];
        if (!target || target === '~') {
            currentPath = '/home';
            return '';
        }
        if (target === '..') {
            const parts = currentPath.split('/').filter(p => p);
            parts.pop();
            currentPath = '/' + parts.join('/') || '/';
            return '';
        }
        const newPath = currentPath === '/' ? '/' + target : currentPath + '/' + target;
        if (fileSystem[newPath] && fileSystem[newPath].type === 'dir') {
            currentPath = newPath;
            return '';
        }
        return `cd: ${target}: No such directory`;
    },

    cat: (args) => {
        const file = args[0];
        if (!file) return 'cat: missing file argument';
        const filePath = currentPath === '/' ? '/' + file : currentPath + '/' + file;
        if (fileSystem[filePath] && fileSystem[filePath].type === 'file') {
            return fileSystem[filePath].content;
        }
        return `cat: ${file}: No such file`;
    },

    clear: () => {
        const content = document.getElementById('terminal-content');
        if (content) content.innerHTML = '';
        return null;
    },

    whoami: () => 'visitor@906.sh',
    date: () => new Date().toString(),
    uname: () => '906.sh DevOS v2.0 (Terminal Edition)',
    echo: (args) => args.join(' '),

    // Easter eggs
    yooper: () => '🏔️ Eh! You must be from the UP too, eh? Go Huskies!',
    '906': () => '📞 The 906 - Upper Peninsula of Michigan. God\'s Country!',
    evan: () => '👋 Hey there! Evan here. Welcome to my corner of the internet!',
    emcknight: () => '💻 That\'s me! Check out emcknight.me for personal stuff.',
    northernwisp: () => '📡 NorthernWISP - Educating the UP on self-hosting!',
    coffee: () => '☕ Brewing... ████████████ 100% - Coffee ready!',
    matrix: () => '🟢 Wake up, Neo... The Matrix has you...',
    esky: () => '🌊 Escanaba - The Riviera of the North!',
    sudo: () => '🔒 Nice try, but you don\'t have root access here!',
};

function executeCommand(input) {
    const parts = input.trim().split(' ');
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    if (commands[cmd]) {
        return commands[cmd](args);
    }
    return `Command not found: ${cmd}. Type 'help' for commands.`;
}

function addTerminalLine(prompt, text) {
    const content = document.getElementById('terminal-content');
    if (!content) return;

    const line = document.createElement('div');
    line.className = 'terminal-line';
    line.innerHTML = `<span class="terminal-prompt">${prompt}</span><span class="terminal-text">${text}</span>`;
    content.appendChild(line);
    content.scrollTop = content.scrollHeight;
}

// Initialize terminal
const terminalInput = document.getElementById('terminal-input');
if (terminalInput) {
    terminalInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const value = terminalInput.value.trim();
            if (value) {
                commandHistory.push(value);
                historyIndex = commandHistory.length;
                addTerminalLine('$', value);
                const result = executeCommand(value);
                if (result !== null && result !== '') {
                    addTerminalLine('', result);
                }
            }
            terminalInput.value = '';
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (historyIndex > 0) {
                historyIndex--;
                terminalInput.value = commandHistory[historyIndex];
            }
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (historyIndex < commandHistory.length - 1) {
                historyIndex++;
                terminalInput.value = commandHistory[historyIndex];
            } else {
                historyIndex = commandHistory.length;
                terminalInput.value = '';
            }
        }
        if (e.key === 'Tab') {
            e.preventDefault();
            const value = terminalInput.value;
            const matchingCmds = Object.keys(commands).filter(cmd => cmd.startsWith(value));
            if (matchingCmds.length === 1) {
                terminalInput.value = matchingCmds[0];
            }
        }
    });
}

// ========== STRIPE DONATION ==========
function openStripeDonation() {
    window.open('https://buy.stripe.com/6oU4gBfIW8689to0vD1oI01', '_blank');
}

// ========== THEME SWITCHER ==========
const themes = ['dark', 'cyberpunk'];
let currentThemeIndex = 0;

function cycleTheme() {
    currentThemeIndex = (currentThemeIndex + 1) % themes.length;
    const theme = themes[currentThemeIndex];

    if (theme === 'dark') {
        document.body.removeAttribute('data-theme');
    } else {
        document.body.setAttribute('data-theme', theme);
    }

    localStorage.setItem('906sh-theme', theme);

    const btn = document.getElementById('theme-btn');
    if (btn) {
        const icons = { dark: '🌙', cyberpunk: '⚡' };
        btn.innerHTML = icons[theme];
        setTimeout(() => btn.innerHTML = '🎨', 1500);
    }
}

function loadTheme() {
    const savedTheme = localStorage.getItem('906sh-theme') || 'dark';
    currentThemeIndex = themes.indexOf(savedTheme);
    if (currentThemeIndex === -1) currentThemeIndex = 0;

    if (savedTheme !== 'dark') {
        document.body.setAttribute('data-theme', savedTheme);
    }
}

// Initialize theme
loadTheme();

// ========== MOBILE MENU ==========
function initMobileMenu() {
    const toggle = document.querySelector('.menu-toggle');
    const nav = document.querySelector('nav');
    const navLinks = document.querySelectorAll('nav a');

    if (!toggle || !nav) return;

    toggle.addEventListener('click', () => {
        toggle.classList.toggle('active');
        nav.classList.toggle('active');
        document.body.classList.toggle('menu-open'); // Prevent scrolling
    });

    // Close menu when a link is clicked
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            toggle.classList.remove('active');
            nav.classList.remove('active');
            document.body.classList.remove('menu-open');
        });
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!nav.contains(e.target) && !toggle.contains(e.target) && nav.classList.contains('active')) {
            toggle.classList.remove('active');
            nav.classList.remove('active');
            document.body.classList.remove('menu-open');
        }
    });
}

// Initialize mobile menu
document.addEventListener('DOMContentLoaded', initMobileMenu);
// Also try to init immediately in case DOM is already loaded
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initMobileMenu();
}
