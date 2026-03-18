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

  // ---------- 初始化 ----------
  buildKeyboard();
  updateScale();

  // 监听窗口大小变化，防抖处理
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resizeKeyboard();
    }, 100);
  });

  // 监听选择变化
  tonicSelect.addEventListener('change', updateScale);
  accidentalSelect.addEventListener('change', updateScale);
  modeSelect.addEventListener('change', updateScale);
})();