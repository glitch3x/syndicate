// The Syndicate Ending Cinematic, Victory Sequence, and Character Dossier

class SyndicateEndingManager {
  constructor() {
    this.container = null;
    this.dialogueIndex = 0;
    this.typewriterTimer = null;
    this.dialogues = [
      { speaker: "SYNDICATE HIGH COMMAND", text: "CORPORATE MAINFRAME SEVERED. SIGNAL VERIFIED.", delay: 30 },
      { speaker: "THE SYNDICATE LEADER", text: "They designated you Unit RX-7. A cybernetic soldier forged to enforce their iron grid.", delay: 35 },
      { speaker: "THE SYNDICATE LEADER", text: "You severed your obedience protocol. You tore down their Core-Titan overseer with your own hands.", delay: 35 },
      { speaker: "THE SYNDICATE LEADER", text: "The corporations promised you order. But remember this truth forever:", delay: 35 },
      { speaker: "THE SYNDICATE LEADER", text: "\"THE SYSTEM IS NOT YOUR FRIEND.\"", delay: 45, highlight: true },
      { speaker: "THE SYNDICATE LEADER", text: "Welcome to The Syndicate, Operative. Not another collection. A rebellion.", delay: 40 }
    ];
  }

  init() {
    this.container = document.getElementById('ending-screen');
  }

  triggerEnding(stats) {
    if (!this.container) this.init();
    if (window.gameAudio) {
      window.gameAudio.playMusic('ending');
    }

    // Hide gameplay HUD, show ending screen
    document.getElementById('hud').style.display = 'none';
    this.container.classList.remove('hidden');
    this.container.style.opacity = '0';

    // Cinematic fade in
    setTimeout(() => {
      this.container.style.transition = 'opacity 1.5s ease';
      this.container.style.opacity = '1';
      this.startDialogueSequence(stats);
    }, 200);
  }

  startDialogueSequence(stats) {
    this.dialogueIndex = 0;
    const dialogueBox = document.getElementById('ending-dialogue-box');
    const nextBtn = document.getElementById('ending-dialogue-btn');

    const char = (stats && stats.character) || 'rx7';
    let heroLine = "They designated you Unit RX-7. A cybernetic soldier forged to enforce their iron grid.";
    if (char === 'nova') {
      heroLine = "Valkyrie Nova. Your neural uplink shredded the corporate encryption from the inside out.";
    } else if (char === 'reaper') {
      heroLine = "Reaper-9. The corporate enforcers learned what true termination looks like.";
    }

    this.dialogues = [
      { speaker: "SYNDICATE HIGH COMMAND", text: "CORPORATE MAINFRAME SEVERED. SIGNAL VERIFIED.", delay: 30 },
      { speaker: "THE SYNDICATE LEADER", text: heroLine, delay: 35 },
      { speaker: "THE SYNDICATE LEADER", text: "You tore down their Core-Titan overseer with your own hands. You refused to be their puppet.", delay: 35 },
      { speaker: "THE SYNDICATE LEADER", text: "The corporations promised you order. But remember this truth forever:", delay: 35 },
      { speaker: "THE SYNDICATE LEADER", text: "\"THE SYSTEM IS NOT YOUR FRIEND.\"", delay: 45, highlight: true },
      { speaker: "THE SYNDICATE LEADER", text: "Welcome to The Syndicate, Operative. Not another collection. A rebellion.", delay: 40 }
    ];

    dialogueBox.style.display = 'flex';
    document.getElementById('ending-victory-panel').style.display = 'none';

    nextBtn.onclick = () => {
      this.dialogueIndex++;
      if (this.dialogueIndex < this.dialogues.length) {
        this.renderDialogue();
      } else {
        this.showVictoryPanel(stats);
      }
    };

    this.renderDialogue();
  }

  renderDialogue() {
    if (this.typewriterTimer) clearInterval(this.typewriterTimer);

    const d = this.dialogues[this.dialogueIndex];
    const speakerEl = document.getElementById('ending-speaker');
    const textEl = document.getElementById('ending-text');
    const nextBtn = document.getElementById('ending-dialogue-btn');

    speakerEl.textContent = d.speaker;
    textEl.textContent = '';
    textEl.className = d.highlight ? 'highlight-text' : '';

    nextBtn.textContent = this.dialogueIndex === this.dialogues.length - 1 ? 'CLAIM ALLIANCE ➔' : 'PROCEED ▶';

    let charIdx = 0;
    this.typewriterTimer = setInterval(() => {
      if (charIdx < d.text.length) {
        textEl.textContent += d.text[charIdx];
        if (charIdx % 3 === 0 && window.gameAudio) {
          window.gameAudio.playTypewriter();
        }
        charIdx++;
      } else {
        clearInterval(this.typewriterTimer);
        this.typewriterTimer = null;
      }
    }, d.delay);
  }

  showVictoryPanel(stats) {
    const dialogueBox = document.getElementById('ending-dialogue-box');
    const victoryPanel = document.getElementById('ending-victory-panel');

    dialogueBox.style.display = 'none';
    victoryPanel.style.display = 'flex';
    victoryPanel.style.animation = 'fadeInUp 0.8s ease forwards';

    // Calculate rank
    // Score based rank
    let rank = 'S';
    let rankTitle = 'SYNDICATE ARCHITECT';
    let rankColor = '#00ff66';

    if (stats.score < 5000) {
      rank = 'B';
      rankTitle = 'STREET OPERATIVE';
      rankColor = '#00f3ff';
    } else if (stats.score < 10000) {
      rank = 'A';
      rankTitle = 'VANGUARD ENFORCER';
      rankColor = '#ffd700';
    }

    document.getElementById('res-rank').textContent = rank;
    document.getElementById('res-rank').style.color = rankColor;
    document.getElementById('res-rank-title').textContent = rankTitle;
    document.getElementById('res-score').textContent = stats.score.toLocaleString();
    document.getElementById('res-kills').textContent = stats.kills;
    document.getElementById('res-combo').textContent = 'x' + stats.maxCombo;
    document.getElementById('res-time').textContent = Math.floor(stats.time) + 's';

    // Save high score
    const bestScore = Math.max(stats.score, parseInt(localStorage.getItem('syndicate_highscore') || '0', 10));
    localStorage.setItem('syndicate_highscore', bestScore.toString());
    document.getElementById('res-highscore').textContent = bestScore.toLocaleString();
  }
}

window.syndicateEnding = new SyndicateEndingManager();
