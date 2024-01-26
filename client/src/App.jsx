import './App.css';
import {
  ObjectDetector,
  FilesetResolver,
  Detection,
  ObjectDetectorResult
} from "@mediapipe/tasks-vision";
import { useEffect, useRef, useState } from 'react'
import Webcam from 'react-webcam';

function App(){
  const [objectDetector, setObjectDetector] = useState(null);
  const webcamRef = useRef(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const liveViewRef = useRef();
  const [boxes, setBoxes] = useState([])

  useEffect(() => {
    if(capturedImage !== null){
      predictWebcam(capturedImage)
    }
  }, [capturedImage])

  const capture = () => {
    const imageSrc = webcamRef.current.getScreenshot();
    const img = document.createElement('img');
    img.src = imageSrc;
    setCapturedImage(img);
  };

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
      runningMode: 'IMAGE'
    });
    setObjectDetector(newObjectDetector);
  }

  useEffect(()=>{
    genObjectDetector()
  },[])

  async function predictWebcam(image) {
    const result = objectDetector.detect(image);
    setBoxes(result.detections)
  }

  return (
    <>
    <div>
      <h2>Demo: Webcam continuous detection</h2>
      <p>Hold some objects up close to your webcam to get a real-time detection! When ready click "enable webcam" below and accept access to the webcam.</p>
      <div>This demo uses a model trained on the COCO dataset. It can identify 80 different classes of object in an image. <a href="https://github.com/amikelive/coco-labels/blob/master/coco-labels-2014_2017.txt" target="_blank">See a list of available classes</a></div>
      <div ref={liveViewRef} className="videoView">
        <Webcam
          audio={false}
          ref={webcamRef}
        />
        <button onClick={capture}>Capture photo</button>
        {boxes.map(box => {
          const boxStyle = {
            left: (webcamRef?.current?.offsetWidth -
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
