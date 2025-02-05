import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { PCDLoader } from 'three/examples/jsm/loaders/PCDLoader';
import { GUI } from 'lil-gui';

const ThreeDScene = () => {
  const objectScene = useRef<THREE.Scene | null>(null);
  const objectCamera = useRef<THREE.PerspectiveCamera | null>(null);
  const floor = useRef<THREE.Mesh | null>(null);
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const renderer = useRef<THREE.WebGLRenderer | null>(null);

  const [isDrawingLine, setIsDrawingLine] = useState(false);
  const [isDrawingPolygon, setIsDrawingPolygon] = useState(false);
  const [currentLine, setCurrentLine] = useState<THREE.Line | null>(null);
  const [lines, setLines] = useState<THREE.Line[]>([]);
  const [polygonVertices, setPolygonVertices] = useState<THREE.Vector3[]>([]);
  const [currentPolygon, setCurrentPolygon] = useState<THREE.Mesh | null>(null);
  const [vertexMarkers, setVertexMarkers] = useState<THREE.Mesh[]>([]);  // To store the vertex markers

  const [selectedVertexIndex, setSelectedVertexIndex] = useState<number | null>(null);


  const handleMouseMove = (event: MouseEvent) => {
    if (selectedVertexIndex !== null && objectCamera.current && floor.current) {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, objectCamera.current);
      const intersects = raycaster.intersectObject(floor.current);

      if (intersects.length > 0) {
        const point = intersects[0].point;
        const updatedVertices = [...polygonVertices];
        updatedVertices[selectedVertexIndex] = new THREE.Vector3(point.x, point.y, 5);
        setPolygonVertices(updatedVertices);

        // Update vertex markser position
        vertexMarkers[selectedVertexIndex].position.set(point.x, point.y, 5);

        // Update polygon geometry
        if (currentPolygon) {
          const polyShape = new THREE.Shape(updatedVertices.map((coord) => new THREE.Vector2(coord.x, coord.y)));
          const polyGeometry = new THREE.ShapeGeometry(polyShape);
          polyGeometry.setAttribute(
            "position",
            new THREE.Float32BufferAttribute(updatedVertices.map((coord) => [coord.x, coord.y, 5]).flat(), 3)


          );
          currentPolygon.geometry.dispose(); // Dispose of the old geometry
          currentPolygon.geometry = polyGeometry;
        }
      }
    }
  };

  const handleMouseUp = () => {
    setSelectedVertexIndex(null);
  };

  const render = () => {
    if (!objectScene.current || !objectCamera.current || !renderer.current) return;
    renderer.current.render(objectScene.current, objectCamera.current);
  };

  useEffect(() => {
    let camera: THREE.PerspectiveCamera;
    let scene: THREE.Scene;
    let controls: OrbitControls;

    const init = () => {
      scene = new THREE.Scene();
      if (!renderer.current) {
        renderer.current = new THREE.WebGLRenderer({ antialias: true });
      }
      camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      camera.position.set(0, 0, -200);
      objectCamera.current = camera;
      if (!renderer.current) {
        return;
      }
      renderer.current.setPixelRatio(window.devicePixelRatio);
      renderer.current.setSize(window.innerWidth, window.innerHeight);
      document.body.appendChild(renderer.current.domElement);

      controls = new OrbitControls(camera, renderer.current.domElement);
      controls.screenSpacePanning = true;
      controls.update();

      const floorGeometry = new THREE.PlaneGeometry(500, 500);
      const floorMaterial = new THREE.MeshPhongMaterial({ color: 0x555555, side: THREE.DoubleSide });
      const _floor = new THREE.Mesh(floorGeometry, floorMaterial);
      _floor.position.z = 10;
      // _floor.rotation.x = Math.PI;
      scene.add(_floor);
      floor.current = _floor;

      const light = new THREE.DirectionalLight(0xffffff, 1);
      light.position.set(10, 10, 10);
      scene.add(light);

      const loader = new PCDLoader();
      loader.load(
        './ld03.pcd',
        (points) => {
          points.geometry.center();
          points.geometry.rotateX(Math.PI);
          scene.add(points);
        },
        undefined,
        (error) => console.error('Error loading PCD file:', error)
      );

      objectScene.current = scene;

      const animate = () => {
        requestAnimationFrame(animate);
        controls.update();
        renderer.current?.render(scene, camera);
      };
      animate();
      window.addEventListener('resize', onWindowResize);
    };

    const onWindowResize = () => {
      if (!camera) return;
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      renderer.current?.setSize(windowWidth, windowHeight);
      camera.aspect = windowWidth / windowHeight;
      camera.updateProjectionMatrix();
    };

    init();

    return () => {
      window.removeEventListener('resize', onWindowResize);
      if (renderer.current) {
        renderer.current?.dispose();
      }
    };
  }, []);

  const handleMouseDown = (event: MouseEvent) => {
    if (event.target != renderer.current?.domElement || !renderer.current?.domElement || !objectCamera.current || !floor.current) {
      return;
    }
    const rect = renderer.current!.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, objectCamera.current);
    const intersects = raycaster.intersectObject(floor.current);

    if (intersects.length > 0) {
      const point = intersects[0].point;
      const updatedVertices = [...polygonVertices];
      updatedVertices[selectedVertexIndex] = new THREE.Vector3(point.x, point.y, 5);
      setPolygonVertices(updatedVertices);

      // Update vertex markers position
      // vertexMarkers[selectedVertexIndex].setAttribute("position", new THREE.Vector3(point.x, point.y, 5));

      // Update polygon geometry
      if (currentPolygon) {
        const polyShape = new THREE.Shape(updatedVertices.map((coord) => new THREE.Vector2(coord.x, coord.y)));
        const polyGeometry = new THREE.ShapeGeometry(polyShape);
        polyGeometry.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(updatedVertices.map((coord) => [coord.x, coord.y, 5]).flat(), 3)
        );
        currentPolygon.geometry.dispose(); // Dispose of the old geometry
        currentPolygon.geometry = polyGeometry;
      }
    }
    if (event.button == 0) {
      if (vertexMarkers.length > 0 && objectCamera.current) {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, objectCamera.current);
        const intersects = raycaster.intersectObjects(vertexMarkers);

        if (intersects.length > 0) {
          const clickedMarker = intersects[0].object;
          const index = vertexMarkers.indexOf(clickedMarker as THREE.Mesh);
          setSelectedVertexIndex(index);
        }
      }
      if (selectedVertexIndex !== null) {
        return;
      }
      if ((isDrawingLine || isDrawingPolygon) && objectCamera.current && floor.current && objectScene.current) {

        mouse.x = event.clientX / window.innerWidth * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, objectCamera.current);
        const intersects = raycaster.intersectObject(floor.current);

        if (intersects.length > 0) {
          const point = intersects[0].point;

          if (isDrawingLine) {
            if (!currentLine) {
              const lineMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff, linewidth: 3 });
              const lineGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(point.x, point.y, 5)]);
              const newLine = new THREE.Line(lineGeometry, lineMaterial);
              objectScene.current.add(newLine);
              setCurrentLine(newLine);
              render();
            } else {
              const _currentLine = objectScene.current.getObjectById(currentLine.id);
              if (!_currentLine || !(_currentLine instanceof THREE.Line)) return;
              const positions = (_currentLine.geometry as THREE.BufferGeometry).attributes.position.array as number[];
              const updatedPositions = [...positions, point.x, point.y, 5];
              _currentLine.geometry.setAttribute('position', new THREE.Float32BufferAttribute(updatedPositions, 3));
              _currentLine.geometry.setDrawRange(0, updatedPositions.length / 3);
              _currentLine.geometry.getAttribute('position').needsUpdate = true;
            }
          }

          if (isDrawingPolygon) {
            setPolygonVertices((prevVertices) => {
              if (!objectScene.current) return [];
              const closestVertexIndex = (newPoint: THREE.Vector3) => {
                let minDist = Infinity;
                let index = -1;
                for (let i = 0; i < prevVertices.length; i++) {
                  const dist = newPoint.distanceTo(prevVertices[i]);
                  if (dist < minDist) {
                    minDist = dist;
                    index = i;
                  }
                }
                return index;
              };

              const crossProductSign = (p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3) => {
                const v1 = new THREE.Vector3().subVectors(p2, p1); // Vector p1 -> p2
                const v2 = new THREE.Vector3().subVectors(p3, p1); // Vector p1 -> p3
                const cross = new THREE.Vector3().crossVectors(v1, v2); // Cross product
                return cross.z; // Return the z-component to determine the orientation in 2D
              };

              const newVertices = [...prevVertices];
              const newPoint = new THREE.Vector3(point.x, point.y, 5); // New point to insert

              if (prevVertices.length >= 2) {
                // Step 1: Find the two closest vertices
                const index1 = closestVertexIndex(newPoint);
                let index2 = (index1 + 1) % prevVertices.length; // Default to the next one
                let minDist = newPoint.distanceTo(prevVertices[index1]);

                for (let i = 0; i < prevVertices.length; i++) {
                  if (i !== index1) {
                    const dist = newPoint.distanceTo(prevVertices[i]);
                    if (dist < minDist) {
                      minDist = dist;
                      index2 = i;
                    }
                  }
                }

                // Step 2: Check the winding order
                const sign = crossProductSign(prevVertices[index1], newPoint, prevVertices[index2]);

                // Step 3: Insert the new point based on winding order
                if (sign > 0) {
                  // Counterclockwise order
                  newVertices.splice(index1 + 1, 0, newPoint);
                } else {
                  // Clockwise order
                  newVertices.splice(index2 + 1, 0, newPoint);
                }
              } else {
                newVertices.push(newPoint);
              }
              // Update vertex markers (yellow circles)
              const vertexMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00, side: THREE.DoubleSide });
              const vertexGeometry = new THREE.CircleGeometry(3, 100);  // Circle with radius 1
              // vertexGeometry.setAttribute('position', new THREE.Float32BufferAttribute([point.x, point.y, -3], 3));  // Position the circle at the vertex
              const vertexMarker = new THREE.Mesh(vertexGeometry, vertexMaterial);
              vertexMarker.position.set(point.x, point.y, 4.9);
              objectScene.current.add(vertexMarker);
              setVertexMarkers((prev) => [...prev, vertexMarker]);

              if (newVertices.length >= 3) {
                // Create polygon using ShapeGeometry
                if (currentPolygon) {
                  objectScene.current.remove(currentPolygon);
                }

                const polyShape = new THREE.Shape(newVertices.map((coord) => new THREE.Vector2(coord.x, coord.y)));
                const polyGeometry = new THREE.ShapeGeometry(polyShape);
                polyGeometry.setAttribute("position", new THREE.Float32BufferAttribute(newVertices.map(coord => [coord.x, coord.y, 5]).flat(), 3));
                const polygon = new THREE.Mesh(polyGeometry, new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide, opacity: 0.3 }));

                objectScene.current.add(polygon);
              }
              // render();;

              return newVertices;
            });
          }
        }
      }
    }
  };

  const startDrawingLine = () => {
    setIsDrawingLine(true);
    setIsDrawingPolygon(false);  // Disable polygon drawing if line drawing starts
  };

  const startDrawingPolygon = () => {
    setIsDrawingPolygon(true);
    setIsDrawingLine(false);  // Disable line drawing if polygon drawing starts
  };

  const saveLine = () => {
    if (currentLine) {
      setLines((prev) => [...prev, currentLine]);
      setCurrentLine(null);
    }
    setIsDrawingLine(false);
  };

  const savePolygon = () => {
    if (polygonVertices.length > 2) {
      setPolygonVertices([]);
      setCurrentPolygon(null);
    }
    setIsDrawingPolygon(false);
  };

  const deleteSelectedPolygon = () => {
    if (currentPolygon && objectScene.current) {
      objectScene.current.remove(currentPolygon);
      setCurrentPolygon(null);
    }
  };

  const deleteSelectedLine = () => {
    if (currentLine && objectScene.current) {
      objectScene.current.remove(currentLine);
      setCurrentLine(null);
    }
  };

  useEffect(() => {
    // Add mouse event listeners
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      // Clean up mouse event listeners
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [selectedVertexIndex, polygonVertices, currentPolygon, vertexMarkers, isDrawingLine, isDrawingPolygon, currentLine]);

  return (
    <div style={{ position: 'relative', height: '100vh' }}>
      {/* 3D Scene */}
      <div id="threeDContainer" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}></div>

      {/* Overlay buttons */}
      <div style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 10 }}>
        <button onClick={startDrawingLine}>Start Drawing Line</button>
        <button onClick={saveLine} disabled={!currentLine}>Save Line</button>
        <button onClick={deleteSelectedLine} disabled={!currentLine}>Delete Selected Line</button>

        <button onClick={startDrawingPolygon}>Start Drawing Polygon</button>
        <button onClick={savePolygon} disabled={polygonVertices.length < 3}>Save Polygon</button>
        <button onClick={deleteSelectedPolygon} disabled={!currentPolygon}>Delete Selected Polygon</button>
      </div>

      <div id="info" style={{ position: 'absolute', bottom: '10px', right: '10px' }}>
        <a href="https://threejs.org" target="_blank" rel="noopener noreferrer">
          three.js
        </a>
      </div>
    </div>
  );
};

export default ThreeDScene;
