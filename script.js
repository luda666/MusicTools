// script.js - 完整功能实现
(function() {
  // ---------- 固定参数 ----------
  const START_MIDI = 48;        // C3
  const END_MIDI = 95;          // B6 → 48键
  const MOBILE_MAX_WIDTH = 1440; // 移动端最大阈值（用于键宽计算）

  const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const NATURAL_PC = [0, 2, 4, 5, 7, 9, 11];
  const TONIC_MAP = { 'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11 };

  const MAJOR_INTERVALS = [0, 2, 4, 5, 7, 9, 11];
  const MINOR_INTERVALS = [0, 2, 3, 5, 7, 8, 10];

  // ---------- DOM 元素 ----------
  const tonicSelect = document.getElementById('tonic-select');
  const accidentalSelect = document.getElementById('accidental-select');
  const modeSelect = document.getElementById('mode-select');
  const scaleNameSpan = document.getElementById('scale-name');
  const scaleNotesList = document.getElementById('scale-notes-list');
  const downloadBtn = document.getElementById('downloadBtn');

  const whiteContainer = document.getElementById('white-keys-container');
  const blackContainer = document.getElementById('black-keys-container');
  const keyboardDiv = document.getElementById('piano-keyboard');

  // 数据存储
  let whiteKeyList = [];          // { midi, pitchClass, octave, dom, labelSpan }
  let blackKeyList = [];          // { midi, pitchClass, octave, leftWhiteIdx, dom, labelSpan }
  let allKeyElements = [];        // { dom, pitchClass, labelSpan }

  // ---------- 生成键盘结构 ----------
  function buildKeyboard() {
    whiteContainer.innerHTML = '';
    blackContainer.innerHTML = '';
    whiteKeyList = [];
    blackKeyList = [];
    allKeyElements = [];

    const midiNotes = [];
    for (let midi = START_MIDI; midi <= END_MIDI; midi++) midiNotes.push(midi);

    // 收集白键
    midiNotes.forEach(midi => {
      const pitchClass = midi % 12;
      const octave = Math.floor(midi / 12) - 1;
      const isBlack = [1, 3, 6, 8, 10].includes(pitchClass);
      if (!isBlack) {
        whiteKeyList.push({ midi, pitchClass, octave, dom: null, labelSpan: null });
      }
    });

    // 收集黑键
    midiNotes.forEach(midi => {
      const pitchClass = midi % 12;
      const octave = Math.floor(midi / 12) - 1;
      const isBlack = [1, 3, 6, 8, 10].includes(pitchClass);
      if (isBlack) {
        const leftWhiteMidi = midi - 1;
        const leftWhiteIdx = whiteKeyList.findIndex(w => w.midi === leftWhiteMidi);
        if (leftWhiteIdx === -1) return;
        blackKeyList.push({ midi, pitchClass, octave, leftWhiteIdx, dom: null, labelSpan: null });
      }
    });

    // 渲染白键
    whiteKeyList.forEach((w) => {
      const whiteDiv = document.createElement('div');
      whiteDiv.className = 'white-key';
      whiteDiv.setAttribute('data-midi', w.midi);
      whiteDiv.setAttribute('data-pitch', w.pitchClass);

      const labelSpan = document.createElement('span');
      labelSpan.className = 'note-label';
      labelSpan.textContent = '';
      whiteDiv.appendChild(labelSpan);

      whiteContainer.appendChild(whiteDiv);
      w.dom = whiteDiv;
      w.labelSpan = labelSpan;
      allKeyElements.push({ dom: whiteDiv, pitchClass: w.pitchClass, labelSpan });
    });

    // 渲染黑键
    blackKeyList.forEach(b => {
      const blackDiv = document.createElement('div');
      blackDiv.className = 'black-key';
      blackDiv.setAttribute('data-midi', b.midi);
      blackDiv.setAttribute('data-pitch', b.pitchClass);

      const labelSpan = document.createElement('span');
      labelSpan.className = 'note-label';
      labelSpan.textContent = '';
      blackDiv.appendChild(labelSpan);

      blackContainer.appendChild(blackDiv);
      b.dom = blackDiv;
      b.labelSpan = labelSpan;
      allKeyElements.push({ dom: blackDiv, pitchClass: b.pitchClass, labelSpan });
    });

    // 初始调整尺寸
    resizeKeyboard();
  }

  // ---------- 计算音阶中文名及映射 ----------
  function getChineseScaleInfo() {
    const tonicLetter = tonicSelect.value;
    const accidental = parseInt(accidentalSelect.value, 10);
    const mode = modeSelect.value;

    const basePc = TONIC_MAP[tonicLetter];
    let rootPc = (basePc + accidental + 12) % 12;

    const intervals = (mode === 'major') ? MAJOR_INTERVALS : MINOR_INTERVALS;
    const scalePcs = intervals.map(interval => (rootPc + interval) % 12);

    const tonicLetterIndex = LETTERS.indexOf(tonicLetter);
    const scaleChineseNames = [];
    const pcToChinese = new Map();

    for (let i = 0; i < 7; i++) {
      const letterIdx = (tonicLetterIndex + i) % 7;
      const letter = LETTERS[letterIdx];
      const naturalPc = NATURAL_PC[letterIdx];
      const targetPc = scalePcs[i];

      let diff = targetPc - naturalPc;
      if (diff > 6) diff -= 12;
      if (diff < -6) diff += 12;

      let chineseName = letter;
      if (diff === 1) chineseName = '升' + letter;
      else if (diff === -1) chineseName = '降' + letter;
      else if (diff === 2) chineseName = '重升' + letter;
      else if (diff === -2) chineseName = '重降' + letter;

      scaleChineseNames.push(chineseName);
      pcToChinese.set(targetPc, chineseName);
    }

    return { scaleChineseNames, pcToChinese, scalePcs };
  }

  // ---------- 生成当前音阶名称 ----------
  function getFormattedScaleName() {
    const tonicLetter = tonicSelect.value;
    const accidental = parseInt(accidentalSelect.value, 10);
    const mode = modeSelect.value;
    const modeChinese = (mode === 'major') ? '大调' : '小调';

    if (accidental === 0) {
      return tonicLetter + modeChinese;
    } else {
      const prefix = accidental === 1 ? '升' : '降';
      return prefix + tonicLetter + modeChinese;
    }
  }

  // ---------- 更新UI ----------
  function updateScale() {
    scaleNameSpan.textContent = getFormattedScaleName();

    const { scaleChineseNames, pcToChinese, scalePcs } = getChineseScaleInfo();

    scaleNotesList.innerHTML = '';
    scaleChineseNames.forEach(name => {
      const itemDiv = document.createElement('div');
      itemDiv.className = 'scale-note-item';
      itemDiv.textContent = name;
      scaleNotesList.appendChild(itemDiv);
    });

    allKeyElements.forEach(item => {
      const { dom, pitchClass, labelSpan } = item;
      if (scalePcs.includes(pitchClass)) {
        dom.classList.add('highlight');
        labelSpan.textContent = pcToChinese.get(pitchClass) || '';
      } else {
        dom.classList.remove('highlight');
        labelSpan.textContent = '';
      }
    });
  }

  // ---------- 动态调整键盘尺寸（核心防重叠逻辑）----------
  function resizeKeyboard() {
    const screenWidth = window.innerWidth;
    const whiteCount = whiteKeyList.length; // 28

    let whiteWidth, blackWidth;
    let whiteFontSize, blackFontSize;

    // 移动端阈值内使用固定键宽（线性映射，保证键宽足够容纳中文）
    if (screenWidth <= MOBILE_MAX_WIDTH) {
      // 线性映射：屏幕宽度从 320px 到 MOBILE_MAX_WIDTH，键宽从 35px 到 60px
      const minWidth = 35;
      const maxWidth = 60;
      const minScreen = 320;
      const maxScreen = MOBILE_MAX_WIDTH;
      // 计算键宽
      whiteWidth = minWidth + (maxWidth - minWidth) * (screenWidth - minScreen) / (maxScreen - minScreen);
      whiteWidth = Math.min(maxWidth, Math.max(minWidth, whiteWidth));
      blackWidth = whiteWidth * 0.6;

      // 根据键宽计算字体大小，保证三个汉字不重叠
      whiteFontSize = Math.floor(whiteWidth / 3); // 键宽/3 约等于汉字宽度
      whiteFontSize = Math.min(16, Math.max(10, whiteFontSize)); // 限制在10-16px
      blackFontSize = Math.floor(blackWidth / 2.5); // 黑键文字稍小
      blackFontSize = Math.min(14, Math.max(9, blackFontSize));
    } else {
      // 桌面端：自适应容器宽度
      const containerWidth = keyboardDiv.clientWidth;
      const availableWidth = containerWidth - 12; // 左右内边距6px
      whiteWidth = availableWidth / whiteCount;
      whiteWidth = Math.max(30, Math.min(70, whiteWidth));
      blackWidth = whiteWidth * 0.6;
      blackWidth = Math.max(20, Math.min(45, blackWidth));

      // 桌面端固定字体大小（也可根据键宽微调，但30px以上可容纳14px）
      whiteFontSize = 14;
      blackFontSize = 12;
    }

    // 设置白键宽度和字体
    whiteKeyList.forEach(w => {
      w.dom.style.width = whiteWidth + 'px';
      w.labelSpan.style.fontSize = whiteFontSize + 'px';
    });

    // 设置黑键宽度、位置和字体
    blackKeyList.forEach(b => {
      const leftIdx = b.leftWhiteIdx;
      const leftPos = (leftIdx + 1) * whiteWidth - blackWidth / 2;
      b.dom.style.width = blackWidth + 'px';
      b.dom.style.left = leftPos + 'px';
      b.labelSpan.style.fontSize = blackFontSize + 'px';
    });

    // 设置白键容器总宽度，确保滚动
    const totalWhiteWidth = whiteCount * whiteWidth;
    whiteContainer.style.width = totalWhiteWidth + 'px';

    // 根据屏幕高度调整黑键高度（保持比例）
    const keyboardHeight = keyboardDiv.clientHeight;
    const blackKeyHeight = Math.floor(keyboardHeight * 0.6); // 黑键高度约为白键高度的60%
    blackKeyList.forEach(b => {
      b.dom.style.height = blackKeyHeight + 'px';
    });
  }

  // ---------- 下载功能：生成独立HTML文件（不包含下载按钮）----------
  function downloadHTML() {
    // 构建不包含下载按钮的独立HTML内容
    const styleContent = document.querySelector('link[rel="stylesheet"]').href 
      ? `/* 样式已内嵌 */
* {
  box-sizing: border-box;
  font-family: 'Segoe UI', 'Noto Sans', system-ui, sans-serif;
  user-select: none;
}
body {
  background: #1e1e1e;
  min-height: 100vh;
  margin: 0;
  padding: 16px;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow-x: hidden;
}
.piano-container {
  max-width: 1400px;
  width: 100%;
  background: #2d2d2d;
  border-radius: 32px 32px 24px 24px;
  padding: 30px 24px 40px 24px;
  box-shadow: 0 20px 30px rgba(0, 0, 0, 0.8), inset 0 1px 4px rgba(255, 255, 255, 0.05);
  border-bottom: 6px solid #1a1a1a;
  position: relative;
}
/* 离线版不包含下载按钮，所以移除相关样式，但保留页面标题的padding */
.page-title {
  color: #e0e0e0;
  font-weight: 500;
  font-size: 1.9rem;
  letter-spacing: 1px;
  margin: 0 0 20px 8px;
  text-shadow: 0 2px 0 #111;
  /* 离线版无需右侧留空，因为没按钮 */
}
.centered-modules {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  margin-bottom: 30px;
}
.scale-name-container {
  text-align: center;
  margin: 0 0 20px 0;
}
.scale-name {
  color: #6fda6f;
  font-size: 4rem;
  font-weight: 700;
  text-shadow: 0 4px 8px rgba(0, 0, 0, 0.6);
  letter-spacing: 2px;
}
.controls {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  justify-content: center;
  background: #3a3a3a;
  padding: 14px 20px;
  border-radius: 56px;
  box-shadow: inset 0 2px 5px #1f1f1f, 0 6px 8px #0f0f0f;
  margin-bottom: 30px;
}
.control-group {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #cccccc;
  font-weight: 400;
  background: #2a2a2a;
  padding: 4px 12px 4px 16px;
  border-radius: 40px;
  box-shadow: inset 0 1px 2px #151515;
}
.control-group label {
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #aaa;
}
.control-group select {
  background: #1f1f1f;
  border: none;
  color: #f0f0f0;
  font-size: 1.1rem;
  font-weight: 500;
  padding: 6px 12px;
  border-radius: 30px;
  outline: none;
  cursor: pointer;
  box-shadow: 0 2px 5px #111;
}
.control-group select:hover {
  background: #2b2b2b;
}
.scale-notes-card {
  background: #2a2a2a;
  border-radius: 48px;
  padding: 20px 30px;
  box-shadow: inset 0 2px 5px #1f1f1f;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 300px;
}
.scale-notes-header {
  color: #dddddd;
  font-size: 1.5rem;
  font-weight: 500;
  margin-bottom: 15px;
  letter-spacing: 1px;
}
.scale-notes-list {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 16px;
}
.scale-note-item {
  color: #ffffb0;
  font-weight: 600;
  font-size: 1.8rem;
  text-align: center;
  background: #3a3a3a;
  padding: 8px 24px;
  border-radius: 40px;
  box-shadow: 0 2px 6px #1a1a1a;
  white-space: nowrap;
}
.piano-keyboard {
  position: relative;
  height: 260px;
  margin-top: 10px;
  margin-bottom: 10px;
  background: #222;
  border-radius: 20px 20px 16px 16px;
  box-shadow: inset 0 -4px 0 #151515, 0 8px 20px black;
  padding: 16px 6px 20px 6px;
  width: 100%;
  overflow-x: auto;
  overflow-y: visible;
  -webkit-overflow-scrolling: touch;
}
.white-keys {
  display: flex;
  flex-direction: row;
  height: 100%;
  gap: 0;
  pointer-events: none;
}
.white-key {
  flex: 0 0 auto;
  height: 100%;
  background: linear-gradient(165deg, #f0f0f0, #d4d4d4);
  border: 1px solid #7a7a7a;
  border-radius: 0 0 8px 8px;
  box-shadow: inset 0 -4px 0 #b3b3b3, inset 0 0 0 1px #ffffffd0, 0 4px 8px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  padding-bottom: 18px;
  font-weight: 600;
  color: #222;
  transition: background 0.1s;
  pointer-events: auto;
  position: relative;
  z-index: 2;
}
.white-key.highlight {
  background: linear-gradient(165deg, #a3f09c, #6ad865);
  border-color: #2a9b37;
  box-shadow: inset 0 -4px 0 #2fb045, inset 0 0 0 1px #cbffc0, 0 4px 12px #34c94e7d;
  color: #003d0a;
}
.white-key .note-label {
  background: rgba(255, 255, 240, 0.3);
  padding: 4px 4px;
  border-radius: 40px;
  font-weight: 600;
  backdrop-filter: blur(2px);
  white-space: nowrap;
}
.black-keys {
  position: absolute;
  top: 16px;
  left: 6px;
  right: 6px;
  bottom: 20px;
  pointer-events: none;
  z-index: 10;
}
.black-key {
  position: absolute;
  height: 160px;
  background: linear-gradient(145deg, #4a4a4a, #2d2d2d);
  border: 1px solid #1a1a1a;
  border-radius: 0 0 6px 6px;
  box-shadow: inset 0 -3px 0 #1f1f1f, 0 5px 12px black;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  padding-bottom: 24px;
  color: #f0f0f0;
  font-weight: 500;
  transition: background 0.1s;
  pointer-events: auto;
  z-index: 30;
  text-shadow: 0 1px 2px black;
}
.black-key.highlight {
  background: linear-gradient(145deg, #7ad873, #43b34e);
  border-color: #269635;
  box-shadow: inset 0 -3px 0 #1f8f2f, 0 5px 12px #5af07aaa;
  color: #002d0a;
  text-shadow: none;
}
.black-key .note-label {
  background: rgba(0, 0, 0, 0.1);
  padding: 4px 2px;
  border-radius: 30px;
  font-weight: 600;
  white-space: nowrap;
}
.scroll-hint {
  text-align: center;
  color: #aaa;
  font-size: 0.9rem;
  margin-top: 5px;
  margin-bottom: 10px;
}
.footer-note {
  color: #999;
  margin-top: 16px;
  text-align: center;
  font-size: 0.9rem;
}
@media (max-width: 1024px) {
  body { padding: 8px; }
  .piano-container { padding: 20px 16px 30px 16px; }
  .page-title { font-size: 1.5rem; margin-left: 4px; margin-bottom: 16px; }
  .scale-name { font-size: 2.5rem; }
  .controls { flex-direction: column; gap: 12px; padding: 16px 12px; width: 100%; max-width: 400px; }
  .control-group { width: 100%; justify-content: space-between; padding: 8px 16px; }
  .control-group label { font-size: 1rem; }
  .control-group select { font-size: 1rem; padding: 8px 12px; min-width: 120px; }
  .scale-notes-card { padding: 16px 20px; min-width: auto; width: 100%; max-width: 500px; }
  .scale-notes-header { font-size: 1.3rem; margin-bottom: 12px; }
  .scale-notes-list { flex-direction: column; align-items: center; gap: 12px; width: 100%; }
  .scale-note-item { font-size: 1.4rem; padding: 6px 16px; width: 100%; max-width: 300px; }
  .piano-keyboard { height: 200px; }
  .black-key { height: 120px; }
  .white-key .note-label { font-size: 10px; padding: 2px 2px; }
  .black-key .note-label { font-size: 9px; padding: 2px 1px; }
  .scroll-hint { display: block; }
}
@media (min-width: 1025px) {
  .scroll-hint { display: none; }
}`
      : '';

    const scriptContent = `// script.js - 完整功能实现（离线版）
(function() {
  const START_MIDI = 48;
  const END_MIDI = 95;
  const MOBILE_MAX_WIDTH = 1440;

  const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const NATURAL_PC = [0, 2, 4, 5, 7, 9, 11];
  const TONIC_MAP = { 'C':0, 'D':2, 'E':4, 'F':5, 'G':7, 'A':9, 'B':11 };
  const MAJOR_INTERVALS = [0, 2, 4, 5, 7, 9, 11];
  const MINOR_INTERVALS = [0, 2, 3, 5, 7, 8, 10];

  const tonicSelect = document.getElementById('tonic-select');
  const accidentalSelect = document.getElementById('accidental-select');
  const modeSelect = document.getElementById('mode-select');
  const scaleNameSpan = document.getElementById('scale-name');
  const scaleNotesList = document.getElementById('scale-notes-list');
  const whiteContainer = document.getElementById('white-keys-container');
  const blackContainer = document.getElementById('black-keys-container');
  const keyboardDiv = document.getElementById('piano-keyboard');

  let whiteKeyList = [];
  let blackKeyList = [];
  let allKeyElements = [];

  function buildKeyboard() {
    whiteContainer.innerHTML = '';
    blackContainer.innerHTML = '';
    whiteKeyList = [];
    blackKeyList = [];
    allKeyElements = [];

    const midiNotes = [];
    for (let midi = START_MIDI; midi <= END_MIDI; midi++) midiNotes.push(midi);

    midiNotes.forEach(midi => {
      const pitchClass = midi % 12;
      const octave = Math.floor(midi / 12) - 1;
      const isBlack = [1, 3, 6, 8, 10].includes(pitchClass);
      if (!isBlack) {
        whiteKeyList.push({ midi, pitchClass, octave, dom: null, labelSpan: null });
      }
    });

    midiNotes.forEach(midi => {
      const pitchClass = midi % 12;
      const octave = Math.floor(midi / 12) - 1;
      const isBlack = [1, 3, 6, 8, 10].includes(pitchClass);
      if (isBlack) {
        const leftWhiteMidi = midi - 1;
        const leftWhiteIdx = whiteKeyList.findIndex(w => w.midi === leftWhiteMidi);
        if (leftWhiteIdx === -1) return;
        blackKeyList.push({ midi, pitchClass, octave, leftWhiteIdx, dom: null, labelSpan: null });
      }
    });

    whiteKeyList.forEach((w) => {
      const whiteDiv = document.createElement('div');
      whiteDiv.className = 'white-key';
      whiteDiv.setAttribute('data-midi', w.midi);
      whiteDiv.setAttribute('data-pitch', w.pitchClass);
      const labelSpan = document.createElement('span');
      labelSpan.className = 'note-label';
      labelSpan.textContent = '';
      whiteDiv.appendChild(labelSpan);
      whiteContainer.appendChild(whiteDiv);
      w.dom = whiteDiv;
      w.labelSpan = labelSpan;
      allKeyElements.push({ dom: whiteDiv, pitchClass: w.pitchClass, labelSpan });
    });

    blackKeyList.forEach(b => {
      const blackDiv = document.createElement('div');
      blackDiv.className = 'black-key';
      blackDiv.setAttribute('data-midi', b.midi);
      blackDiv.setAttribute('data-pitch', b.pitchClass);
      const labelSpan = document.createElement('span');
      labelSpan.className = 'note-label';
      labelSpan.textContent = '';
      blackDiv.appendChild(labelSpan);
      blackContainer.appendChild(blackDiv);
      b.dom = blackDiv;
      b.labelSpan = labelSpan;
      allKeyElements.push({ dom: blackDiv, pitchClass: b.pitchClass, labelSpan });
    });

    resizeKeyboard();
  }

  function getChineseScaleInfo() {
    const tonicLetter = tonicSelect.value;
    const accidental = parseInt(accidentalSelect.value, 10);
    const mode = modeSelect.value;
    const basePc = TONIC_MAP[tonicLetter];
    let rootPc = (basePc + accidental + 12) % 12;
    const intervals = (mode === 'major') ? MAJOR_INTERVALS : MINOR_INTERVALS;
    const scalePcs = intervals.map(interval => (rootPc + interval) % 12);
    const tonicLetterIndex = LETTERS.indexOf(tonicLetter);
    const scaleChineseNames = [];
    const pcToChinese = new Map();

    for (let i = 0; i < 7; i++) {
      const letterIdx = (tonicLetterIndex + i) % 7;
      const letter = LETTERS[letterIdx];
      const naturalPc = NATURAL_PC[letterIdx];
      const targetPc = scalePcs[i];
      let diff = targetPc - naturalPc;
      if (diff > 6) diff -= 12;
      if (diff < -6) diff += 12;
      let chineseName = letter;
      if (diff === 1) chineseName = '升' + letter;
      else if (diff === -1) chineseName = '降' + letter;
      else if (diff === 2) chineseName = '重升' + letter;
      else if (diff === -2) chineseName = '重降' + letter;
      scaleChineseNames.push(chineseName);
      pcToChinese.set(targetPc, chineseName);
    }
    return { scaleChineseNames, pcToChinese, scalePcs };
  }

  function getFormattedScaleName() {
    const tonicLetter = tonicSelect.value;
    const accidental = parseInt(accidentalSelect.value, 10);
    const mode = modeSelect.value;
    const modeChinese = (mode === 'major') ? '大调' : '小调';
    if (accidental === 0) {
      return tonicLetter + modeChinese;
    } else {
      const prefix = accidental === 1 ? '升' : '降';
      return prefix + tonicLetter + modeChinese;
    }
  }

  function updateScale() {
    scaleNameSpan.textContent = getFormattedScaleName();
    const { scaleChineseNames, pcToChinese, scalePcs } = getChineseScaleInfo();
    scaleNotesList.innerHTML = '';
    scaleChineseNames.forEach(name => {
      const itemDiv = document.createElement('div');
      itemDiv.className = 'scale-note-item';
      itemDiv.textContent = name;
      scaleNotesList.appendChild(itemDiv);
    });
    allKeyElements.forEach(item => {
      const { dom, pitchClass, labelSpan } = item;
      if (scalePcs.includes(pitchClass)) {
        dom.classList.add('highlight');
        labelSpan.textContent = pcToChinese.get(pitchClass) || '';
      } else {
        dom.classList.remove('highlight');
        labelSpan.textContent = '';
      }
    });
  }

  function resizeKeyboard() {
    const screenWidth = window.innerWidth;
    const whiteCount = whiteKeyList.length;
    let whiteWidth, blackWidth;
    let whiteFontSize, blackFontSize;

    if (screenWidth <= MOBILE_MAX_WIDTH) {
      const minWidth = 35;
      const maxWidth = 60;
      const minScreen = 320;
      const maxScreen = MOBILE_MAX_WIDTH;
      whiteWidth = minWidth + (maxWidth - minWidth) * (screenWidth - minScreen) / (maxScreen - minScreen);
      whiteWidth = Math.min(maxWidth, Math.max(minWidth, whiteWidth));
      blackWidth = whiteWidth * 0.6;
      whiteFontSize = Math.floor(whiteWidth / 3);
      whiteFontSize = Math.min(16, Math.max(10, whiteFontSize));
      blackFontSize = Math.floor(blackWidth / 2.5);
      blackFontSize = Math.min(14, Math.max(9, blackFontSize));
    } else {
      const containerWidth = keyboardDiv.clientWidth;
      const availableWidth = containerWidth - 12;
      whiteWidth = availableWidth / whiteCount;
      whiteWidth = Math.max(30, Math.min(70, whiteWidth));
      blackWidth = whiteWidth * 0.6;
      blackWidth = Math.max(20, Math.min(45, blackWidth));
      whiteFontSize = 14;
      blackFontSize = 12;
    }

    whiteKeyList.forEach(w => {
      w.dom.style.width = whiteWidth + 'px';
      w.labelSpan.style.fontSize = whiteFontSize + 'px';
    });

    blackKeyList.forEach(b => {
      const leftIdx = b.leftWhiteIdx;
      const leftPos = (leftIdx + 1) * whiteWidth - blackWidth / 2;
      b.dom.style.width = blackWidth + 'px';
      b.dom.style.left = leftPos + 'px';
      b.labelSpan.style.fontSize = blackFontSize + 'px';
    });

    const totalWhiteWidth = whiteCount * whiteWidth;
    whiteContainer.style.width = totalWhiteWidth + 'px';

    const keyboardHeight = keyboardDiv.clientHeight;
    const blackKeyHeight = Math.floor(keyboardHeight * 0.6);
    blackKeyList.forEach(b => {
      b.dom.style.height = blackKeyHeight + 'px';
    });
  }

  buildKeyboard();
  updateScale();

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resizeKeyboard();
    }, 100);
  });

  tonicSelect.addEventListener('change', updateScale);
  accidentalSelect.addEventListener('change', updateScale);
  modeSelect.addEventListener('change', updateScale);
})();`;

    // 构建完整的独立HTML（不包含下载按钮）
    const standaloneHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=yes">
  <title>音阶查找索引</title>
  <style>
${styleContent}
  </style>
</head>
<body>
<div class="piano-container">
  <div class="page-title">🎹 音阶查找索引</div>
  <div class="centered-modules">
    <div class="scale-name-container">
      <span id="scale-name" class="scale-name">C大调</span>
    </div>
    <div class="controls">
      <div class="control-group">
        <label>起音</label>
        <select id="tonic-select">
          <option value="C">C</option>
          <option value="D">D</option>
          <option value="E">E</option>
          <option value="F">F</option>
          <option value="G">G</option>
          <option value="A">A</option>
          <option value="B">B</option>
        </select>
      </div>
      <div class="control-group">
        <label>升降</label>
        <select id="accidental-select">
          <option value="0">不变</option>
          <option value="1">升 ♯</option>
          <option value="-1">降 ♭</option>
        </select>
      </div>
      <div class="control-group">
        <label>调式</label>
        <select id="mode-select">
          <option value="major">大调</option>
          <option value="minor">小调</option>
        </select>
      </div>
    </div>
    <div class="scale-notes-card">
      <div class="scale-notes-header">音阶的音</div>
      <div class="scale-notes-list" id="scale-notes-list"></div>
    </div>
  </div>
  <div class="piano-keyboard" id="piano-keyboard">
    <div class="white-keys" id="white-keys-container"></div>
    <div class="black-keys" id="black-keys-container"></div>
  </div>
  <div class="scroll-hint">← 左右滑动查看全部键盘 →</div>
  <div class="footer-note">* 绿色键为音阶音符，显示中文音名（重升/重降自动适配）</div>
</div>
<script>
${scriptContent}
<\/script>
</body>
</html>`;

    // 创建Blob并下载
    const blob = new Blob([standaloneHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '音阶查找索引.html';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  // ---------- 初始化 ----------
  buildKeyboard();
  updateScale();

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resizeKeyboard();
    }, 100);
  });

  tonicSelect.addEventListener('change', updateScale);
  accidentalSelect.addEventListener('change', updateScale);
  modeSelect.addEventListener('change', updateScale);

  // 监听下载按钮（仅在线版有效）
  downloadBtn.addEventListener('click', downloadHTML);
})();
