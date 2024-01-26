import './App.css';
import {
  ObjectDetector,
  FilesetResolver,
  Detection,
  ObjectDetectorResult
} from "@mediapipe/tasks-vision";
import { useEffect, useRef, useState } from 'react'
import Webcam from 'react-webcam';
import { Stage, Layer, Rect, Transformer } from 'react-konva';


function Rectangle({ shapeProps, isSelected, onSelect, onChange }){
  const shapeRef = useRef();
  const trRef = useRef();

  useEffect(() => {
    if (isSelected) {
      // we need to attach transformer manually
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

  return (
    <>
      <Rect
        onClick={onSelect}
        onTap={onSelect}
        ref={shapeRef}
        {...shapeProps}
        draggable
        onDragEnd={(e) => {
          onChange({
            ...shapeProps,
            x: e.target.x(),
            y: e.target.y(),
          });
        }}
        onTransformEnd={(e) => {
          // transformer is changing scale of the node
          // and NOT its width or height
          // but in the store we have only width and height
          // to match the data better we will reset scale on transform end
          const node = shapeRef.current;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();

          // we will reset it back
          node.scaleX(1);
          node.scaleY(1);
          onChange({
            ...shapeProps,
            x: node.x(),
            y: node.y(),
            // set minimal value
            width: Math.max(5, node.width() * scaleX),
            height: Math.max(node.height() * scaleY),
          });
        }}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          flipEnabled={false}
          boundBoxFunc={(oldBox, newBox) => {
            // limit resize
            if (Math.abs(newBox.width) < 5 || Math.abs(newBox.height) < 5) {
              return oldBox;
            }
            return newBox;
          }}
        />
      )}
    </>
  );
};

const initialRectangles = [
  {
    x: 10,
    y: 10,
    width: 100,
    height: 100,
    stroke: 'red',
    id: 'rect1',
  },
  {
    x: 150,
    y: 150,
    width: 100,
    height: 100,
    stroke: 'green',
    id: 'rect2',
  },
];

function App(){
  const [objectDetector, setObjectDetector] = useState(null);
  const [objectDetectorVideo, setObjectDetectorVideo] = useState(null);
  const webcamRef = useRef(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [stageSize, setStageSize] = useState([100, 100]);
  const liveViewRef = useRef();
  const [detections, setDetections] = useState([])
  const [rectangles, setRectangles] = useState(initialRectangles);
  const [selectedShape, selectShape] = useState(null)

  useEffect(() => {
    if(capturedImage !== null){
      predictWebcam(capturedImage)
    }
  }, [capturedImage])

  const checkDeselect = (e) => {
    // deselect when clicked on empty area
    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty) {
      selectShape(null);
    }
  };

  const updateStageSize = () => {
    setStageSize([liveViewRef.current.offsetWidth, liveViewRef.current.offsetHeight - 30])
  }

  useEffect(() => {
    const handleResize = () => {
      if(liveViewRef.current != null){
        updateStageSize()
      }
    };

    window.addEventListener('resize', handleResize);

    // Call handler right away so state gets updated with initial window size
    handleResize();

    // Remove event listener on cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, [])

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
      scoreThreshold: 0.45,
      runningMode: 'IMAGE'
    });
    setObjectDetector(newObjectDetector);
  }

  useEffect(()=>{
    genObjectDetector()
  },[])

  async function predictWebcam(image) {
    const result = objectDetector.detect(image);
    console.log(result)
    setDetections(result.detections)
  }

  return (
    <>
    <div>
      <h2>Demo: Webcam continuous detection</h2>
      <p>Hold some objects up close to your webcam to get a real-time detection! When ready click "enable webcam" below and accept access to the webcam.</p>
      <div>This demo uses a model trained on the COCO dataset. It can identify 80 different classes of object in an image. <a href="https://github.com/amikelive/coco-labels/blob/master/coco-labels-2014_2017.txt" target="_blank">See a list of available classes</a></div>
      <div ref={liveViewRef} className="videoView">
        {/*ref: https://konvajs.org/docs/react/Transformer.html*/}
        <Stage style={{
          position: 'absolute',
          zIndex: 2
          }} width={stageSize[0]} height={stageSize[1]}>
          <Layer>
            {
              rectangles.map((rect, i) => (
                <Rectangle
                  key={i}
                  shapeProps={rect}
                  isSelected={rect.id === selectedShape}
                  onSelect={() => {
                    selectShape(rect.id);
                  }}
                  onChange={(newAttrs) => {
                    const rects = rectangles.slice();
                    rects[i] = newAttrs;
                    setRectangles(rects);
                  }}
                />
              )
            )}
          </Layer>
        </Stage>
        <Webcam
          onPlay={() => {
            updateStageSize()
          }}
          style={{transform: 'rotateY(180deg)'}}
          audio={false}
          ref={webcamRef}
        />
        <button onClick={capture}>Capture photo</button>
        {detections.map(box => {
          const boxStyle = {
            left: (webcamRef.current.video.offsetWidth -
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
              <div className='highlighter'
                style={boxStyle}>
                  <div style={{color: 'white', background: 'black'}}>{box.categories[0].categoryName + ' - ' + box.categories[0].score.toFixed(2)}</div>
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
