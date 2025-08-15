import React, { useState, useCallback, useMemo } from 'react';
import HypercubeViewer from './components/HypercubeViewer';
import Controls, { ThemeName } from './components/Controls';
import CarvedObjectViewer from './components/CarvedObjectViewer';
import { ShapeName, polytopes, Point3D } from './lib/polytopes';
import { DimensionalKeySpec, NO_KEY, TRAINING_W_ONLY, INTERNAL_W_PLUS, Plane } from './lib/security';

export type TrainingEvent = 'try_3d' | 'try_w_denied' | 'acquire_key' | 'try_w_granted' | 'complete';

const App: React.FC = () => {
  const [shape, setShape] = useState<ShapeName>('Tesseract');
  const [theme, setTheme] = useState<ThemeName>('Cyber');
  
  // Visual effect states
  const [braidEnabled, setBraidEnabled] = useState(true);
  const [braidStrands, setBraidStrands] = useState(4);
  const [braidAmplitude, setBraidAmplitude] = useState(12);
  const [sectorTwist, setSectorTwist] = useState(0.0);
  const [enableDataPackage, setEnableDataPackage] = useState(false);
  const [packageSpeed, setPackageSpeed] = useState(0.4);
  const [packageWidth, setPackageWidth] = useState(0.25);
  const [cellHalo, setCellHalo] = useState(true); // Enabled for bloom
  const [showLegend, setShowLegend] = useState(true);

  // --- Glow/Bloom State ---
  const [glowEnabled, setGlowEnabled] = useState(true);
  const [bloomStrength, setBloomStrength] = useState(0.6);
  const [haloStrength, setHaloStrength] = useState(0.35);
  const [additiveBlend, setAdditiveBlend] = useState(true);
  const [edgeColorLock, setEdgeColorLock] = useState(true);

  // --- Geometric Exploration State ---
  const [isSlicing, setIsSlicing] = useState(false);
  const [sliceW, setSliceW] = useState(0.0);

  // --- Path Carver State ---
  const [isCarving, setIsCarving] = useState(false);
  const [carvedSlices, setCarvedSlices] = useState<Point3D[][]>([]);
  const [showCarvedObject, setShowCarvedObject] = useState(false);

  // --- Dimensional Sprite State ---
  const [spriteTraversalEnabled, setSpriteTraversalEnabled] = useState(false);
  const [spriteDimension, setSpriteDimension] = useState<'X'|'Y'|'Z'|'W'>('W');
  const [spriteSpeed, setSpriteSpeed] = useState(1.0);

  // --- New Dimensional Locking & Training State ---
  const [keySpec, setKeySpec] = useState<DimensionalKeySpec>(NO_KEY);
  const [hasSecureKey, setHasSecureKey] = useState(false);
  const [trainingStep, setTrainingStep] = useState<TrainingEvent>('try_3d');

  const trainingTasks = useMemo(() => ([
    { id: 'try_3d', title: 'Perform a standard 3D rotation (Drag mouse)', done: trainingStep !== 'try_3d' },
    { id: 'try_w_denied', title: 'Attempt a W-plane rotation (Hold "W" + Drag)', done: trainingStep !== 'try_3d' && trainingStep !== 'try_w_denied' },
    { id: 'acquire_key', title: 'Acquire Secure Key 🔑', done: hasSecureKey },
    { id: 'try_w_granted', title: 'Perform a W-plane rotation (Hold "W" + Drag)', done: trainingStep === 'complete' },
    { id: 'complete', title: 'Dimensional Lock bypassed. Tutorial complete.', done: trainingStep === 'complete' },
  ]), [hasSecureKey, trainingStep]);

  const lastMessage = useMemo(() => {
    switch (trainingStep) {
      case 'try_3d': return 'Welcome. Drag with your mouse to perform a standard 3D rotation.';
      case 'try_w_denied': return 'Good. Now, hold the "W" key and drag to attempt rotation into the 4th dimension.';
      case 'acquire_key': return 'Access Denied. Rotation locked. Click the floating key icon 🔑 to acquire credentials.';
      case 'try_w_granted': return 'Key acquired! Hold "W" and drag again to use your new permissions.';
      case 'complete': return 'Access Granted! You have successfully rotated in a locked dimension.';
      default: return '';
    }
  }, [trainingStep]);

  const handleTrainingEvent = useCallback((event: TrainingEvent) => {
    setTrainingStep(currentStep => {
      if (event === 'try_3d' && currentStep === 'try_3d') return 'try_w_denied';
      if (event === 'try_w_denied' && currentStep === 'try_w_denied') return 'acquire_key';
      if (event === 'try_w_granted' && currentStep === 'try_w_granted') return 'complete';
      return currentStep;
    });
  }, []);
  
  const handleAcquireKey = useCallback(() => {
    if(hasSecureKey) return;
    setHasSecureKey(true);
    setKeySpec(TRAINING_W_ONLY);
    handleTrainingEvent('acquire_key');
    setTrainingStep('try_w_granted');
  }, [handleTrainingEvent, hasSecureKey]);

  // --- Path Carver Handlers ---
  const handleIsCarvingChange = useCallback((carving: boolean) => {
    if (carving) {
      setCarvedSlices([]); // Clear previous path on start
    }
    setIsCarving(carving);
  }, []);

  const handleSliceCarved = useCallback((points: Point3D[]) => {
    if (points.length > 0) {
      setCarvedSlices(prev => [...prev, points]);
    }
  }, []);

  const handleClearCarvedPath = useCallback(() => {
    setCarvedSlices([]);
  }, []);

  const handleExportCarvedObject = useCallback(() => {
    const objContent = carvedSlices.flat().map(p => `v ${p.x.toFixed(4)} ${p.y.toFixed(4)} ${p.z.toFixed(4)}`).join('\n');
    const blob = new Blob([objContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'carved_object.obj';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [carvedSlices]);


  return (
    <div 
      className="min-h-screen text-white flex flex-col items-center justify-center p-4 font-sans antialiased overflow-hidden relative"
      style={{ background: 'radial-gradient(1200px 900px at 50% 50%, #0f1720 0%, #0a0f14 60%, #070a0d 100%)' }}
    >
      <header className="absolute top-4 left-4 z-10 pointer-events-none">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-cyan-300">
          TesserAct — Dimensional Lock Training
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Simulating kinematic access control for a 4D network.
        </p>
      </header>
      
      {!showCarvedObject && (
        <aside className="absolute right-4 top-4 z-20 w-80 rounded-xl bg-black/60 backdrop-blur p-3 shadow-lg space-y-2">
          <div className="text-xs uppercase font-bold text-cyan-300">Access Tutorial</div>
          <div className="text-sm">{lastMessage}</div>

          <ul className="text-xs space-y-1 mt-2">
            {trainingTasks.map(t => (
              <li key={t.id} className={`flex items-center gap-2 transition-opacity ${t.done ? 'opacity-100' : 'opacity-60'}`}>
                <span>{t.done ? '✅' : '•'}</span>
                <span>{t.title}</span>
              </li>
            ))}
          </ul>
        </aside>
      )}

      <Controls
        shape={shape}
        onShapeChange={setShape}
        theme={theme}
        onThemeChange={setTheme}
        
        braidEnabled={braidEnabled}
        onBraidEnabledChange={setBraidEnabled}
        braidStrands={braidStrands}
        onBraidStrandsChange={setBraidStrands}
        braidAmplitude={braidAmplitude}
        onBraidAmplitudeChange={setBraidAmplitude}
        
        sectorTwist={sectorTwist}
        onSectorTwistChange={setSectorTwist}

        enableDataPackage={enableDataPackage}
        onEnableDataPackageChange={setEnableDataPackage}
        packageSpeed={packageSpeed}
        onPackageSpeedChange={setPackageSpeed}
        packageWidth={packageWidth}
        onPackageWidthChange={setPackageWidth}

        cellHalo={cellHalo}
        onCellHaloChange={setCellHalo}
        
        showLegend={showLegend}
        onShowLegendChange={setShowLegend}

        glowEnabled={glowEnabled}
        onGlowEnabledChange={setGlowEnabled}
        bloomStrength={bloomStrength}
        onBloomStrengthChange={setBloomStrength}
        haloStrength={haloStrength}
        onHaloStrengthChange={setHaloStrength}
        additiveBlend={additiveBlend}
        onAdditiveBlendChange={setAdditiveBlend}
        edgeColorLock={edgeColorLock}
        onEdgeColorLockChange={setEdgeColorLock}

        isSlicing={isSlicing}
        onIsSlicingChange={setIsSlicing}
        sliceW={sliceW}
        onSliceWChange={setSliceW}

        isCarving={isCarving}
        onIsCarvingChange={handleIsCarvingChange}
        showCarvedObject={showCarvedObject}
        onShowCarvedObjectChange={setShowCarvedObject}
        onClearCarvedPath={handleClearCarvedPath}
        onExportCarvedObject={handleExportCarvedObject}
        
        spriteTraversalEnabled={spriteTraversalEnabled}
        onSpriteTraversalEnabledChange={setSpriteTraversalEnabled}
        spriteDimension={spriteDimension}
        onSpriteDimensionChange={setSpriteDimension}
        spriteSpeed={spriteSpeed}
        onSpriteSpeedChange={setSpriteSpeed}
        
        hasSecureKey={hasSecureKey}
        keyPlanesAllowed={keySpec.allowed}
        trainingCompleted={trainingStep === 'complete'}
      />

      <main className="absolute top-0 left-0 w-full h-full">
        {showCarvedObject ? (
          <CarvedObjectViewer carvedSlices={carvedSlices} />
        ) : (
          <HypercubeViewer
            polytope={polytopes[shape]}
            theme={theme}
            
            braidEnabled={braidEnabled}
            braidStrands={braidStrands}
            braidAmplitude={braidAmplitude}
            
            sectorTwist={sectorTwist}

            enableDataPackage={enableDataPackage}
            packageSpeed={packageSpeed}
            packageWidth={packageWidth}
            cellHalo={cellHalo}
            
            showLegend={showLegend}
            
            glowEnabled={glowEnabled}
            bloomStrength={bloomStrength}
            haloStrength={haloStrength}
            additiveBlend={additiveBlend}
            edgeColorLock={edgeColorLock}

            isSlicing={isSlicing}
            sliceW={sliceW}
            isCarving={isCarving}
            onSliceCarved={handleSliceCarved}

            spriteTraversalEnabled={spriteTraversalEnabled}
            spriteDimension={spriteDimension}
            spriteSpeed={spriteSpeed}

            hasSecureKey={hasSecureKey}
            keySpec={keySpec}
            onTrainingEvent={handleTrainingEvent}
            trainingStep={trainingStep}
            onImportKey={handleAcquireKey}
          />
        )}
      </main>

      <footer className="fixed bottom-4 text-center text-gray-500 text-sm z-10 pointer-events-none">
        <p>A TesserAct simulator for encrypted network geometry.</p>
      </footer>
    </div>
  );
};

export default App;