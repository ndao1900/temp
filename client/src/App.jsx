import './App.css';
import {
  ObjectDetector,
  FilesetResolver,
  Detection,
  ObjectDetectorResult
} from "@mediapipe/tasks-vision";
import react, { useEffect, useRef, useState } from 'react'

function App(){
  const [objectDetector, setObjectDetector] = useState(null);
  const videoRef = useRef();
  const liveViewRef = useRef();
  const [boxes, setBoxes] = useState([])

  useEffect(() => {
    console.log(videoRef.current)
  }, [videoRef.current])

  // Initialize the object detector
  async function genObjectDetector(){
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.2/wasm"
    );
    const newObjectDetector = await ObjectDetector.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite',
        delegate: "GPU"
      },
      scoreThreshold: 0.5,
      runningMode: 'VIDEO'
    });
    setObjectDetector(newObjectDetector);
  }

  useEffect(()=>{
    genObjectDetector()
  },[])
 
  // Check if webcam access is supported.
  function hasGetUserMedia() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  // Keep a reference of all the child elements we create
  // so we can remove them easilly on each render.
  var children = [];

  // Enable the live webcam view and start detection.
  async function enableCam(_) {
    if (!objectDetector) {
      console.log("Wait! objectDetector not loaded yet.");
      return;
    }

    // getUsermedia parameters
    const constraints = {
      video: true
    };

    // Activate the webcam stream.
    navigator.mediaDevices
      .getUserMedia(constraints)
      .then((stream) => {
        // console.log('settingStream');
        let video = document.querySelector("video");
        video.srcObject = stream;
      })
      .catch((err) => {
        console.error(err);
        /* handle the error */
      });
  }

  let lastVideoTime = -1;
  async function predictWebcam() {
    let startTimeMs = performance.now();

    // Detect objects using detectForVideo.
    if (videoRef.current.currentTime !== lastVideoTime) {
      lastVideoTime = videoRef.current.currentTime;
      const detections = objectDetector.detectForVideo(videoRef.current, startTimeMs);
      displayVideoDetections(detections);
    }
    // Call this function again to keep predicting when the browser is ready.
    window.requestAnimationFrame(predictWebcam);
  }

  function displayVideoDetections(result: ObjectDetectorResult) {
    setBoxes(result.detections);
  }
  return (
    <>
    <div>
      <h2>Demo: Webcam continuous detection</h2>
      <p>Hold some objects up close to your webcam to get a real-time detection! When ready click "enable webcam" below and accept access to the webcam.</p>
      <div>This demo uses a model trained on the COCO dataset. It can identify 80 different classes of object in an image. <a href="https://github.com/amikelive/coco-labels/blob/master/coco-labels-2014_2017.txt" target="_blank">See a list of available classes</a></div>
      <div ref={liveViewRef} className="videoView">
        <button id="webcamButton" className="mdc-button mdc-button--raised" onClick={enableCam}>
          <span className="mdc-button__ripple"></span>
          <span className="mdc-button__label">ENABLE WEBCAM</span>
        </button>
        <video style={{transform: 'rotateY(180deg)'}} ref={videoRef} id="webcam" autoPlay playsInline onLoadedData={predictWebcam} />
        {boxes.map(box => {
          const boxStyle = {
            left: (videoRef?.current?.offsetWidth -
              box.boundingBox.width -
              box.boundingBox.originX) +
            "px",
            top: box.boundingBox.originY + "px",
            width: (box.boundingBox.width - 10) +
            "px",
            height: box.boundingBox.height +
            "px"
          }
          return(
            <>
              <p 
                style={{...boxStyle, height: '30px'}}>{box.categories[0].categoryName}
              </p>
              <div className='highlighter'
                style={boxStyle}>{box.categories[0].categoryName}
              </div>

            </>
          )}
        )}
      </div>
    </div>
    </>
  );
}

export default App;
