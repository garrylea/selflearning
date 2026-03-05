let mediaRecorder;
let audioChunks = [];
let audioContext;
let analyser;
let dataArray;
let animationId;

const recordBtn = document.getElementById('record-btn');
const stopBtn = document.getElementById('stop-btn');
const status = document.getElementById('status');
const audioContainer = document.getElementById('audio-container');

// 创建画布用于显示波形
const canvas = document.createElement('canvas');
canvas.width = 300;
canvas.height = 60;
canvas.style.display = 'none';
canvas.style.marginTop = '10px';
canvas.style.background = '#000';
document.querySelector('.card').insertBefore(canvas, audioContainer);
const canvasCtx = canvas.getContext('2d');

function draw() {
  animationId = requestAnimationFrame(draw);
  analyser.getByteFrequencyData(dataArray);
  canvasCtx.fillStyle = 'rgb(0, 0, 0)';
  canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
  const barWidth = (canvas.width / dataArray.length) * 2.5;
  let barHeight;
  let x = 0;
  for (let i = 0; i < dataArray.length; i++) {
    barHeight = dataArray[i] / 2;
    canvasCtx.fillStyle = `rgb(${barHeight + 100}, 50, 50)`;
    canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
    x += barWidth + 1;
  }
}

recordBtn.onclick = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // 音频分析逻辑
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(stream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    dataArray = new Uint8Array(analyser.frequencyBinCount);
    canvas.style.display = 'block';
    draw();

    // 录音逻辑 - 尝试多种可能的 MIME 类型
    const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
    console.log("Using MIME type:", mimeType);
    mediaRecorder = new MediaRecorder(stream, { mimeType });
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) audioChunks.push(event.data);
    };

    mediaRecorder.onstop = () => {
      cancelAnimationFrame(animationId);
      const audioBlob = new Blob(audioChunks, { type: mimeType });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.controls = true;
      audioContainer.innerHTML = '';
      audioContainer.appendChild(audio);
      status.innerText = "录音回放就绪 (格式: " + mimeType + ")";
      audioChunks = [];
    };

    mediaRecorder.start();
    status.innerText = "正在录音 (请观察下方波动)...";
    recordBtn.style.display = 'none';
    stopBtn.style.display = 'inline-block';
  } catch (err) {
    status.innerText = "错误: " + err.message;
    console.error(err);
  }
};

stopBtn.onclick = () => {
  mediaRecorder.stop();
  audioContext.close();
  status.innerText = "正在处理录音...";
  stopBtn.style.display = 'none';
  recordBtn.style.display = 'inline-block';
};
