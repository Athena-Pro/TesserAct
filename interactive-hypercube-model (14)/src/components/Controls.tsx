import React from 'react';
import { ShapeName, shapeNames } from '../lib/polytopes';
import { Plane } from '../lib/security';

export type ThemeName = 'Cyber' | 'Mono' | 'Aurora';
export const themeNames: ThemeName[] = ['Cyber', 'Mono', 'Aurora'];
type SpriteDimension = 'X' | 'Y' | 'Z' | 'W';

interface ControlsProps {
  shape: ShapeName;
  onShapeChange: (shape: ShapeName) => void;
  theme: ThemeName;
  onThemeChange: (theme: ThemeName) => void;

  braidEnabled: boolean;
  onBraidEnabledChange: (v: boolean) => void;
  braidStrands: number;
  onBraidStrandsChange: (n: number) => void;
  braidAmplitude: number;
  onBraidAmplitudeChange: (n: number) => void;

  sectorTwist: number;
  onSectorTwistChange: (n: number) => void;

  enableDataPackage: boolean;
  onEnableDataPackageChange: (v: boolean) => void;
  packageSpeed: number;
  onPackageSpeedChange: (n: number) => void;
  packageWidth: number;
  onPackageWidthChange: (n: number) => void;

  cellHalo: boolean;
  onCellHaloChange: (v: boolean) => void;

  showLegend: boolean;
  onShowLegendChange: (v: boolean) => void;

  glowEnabled: boolean;
  onGlowEnabledChange: (v: boolean) => void;
  bloomStrength: number;
  onBloomStrengthChange: (n: number) => void;
  haloStrength: number;
  onHaloStrengthChange: (n: number) => void;
  additiveBlend: boolean;
  onAdditiveBlendChange: (v: boolean) => void;
  edgeColorLock: boolean;
  onEdgeColorLockChange: (v: boolean) => void;

  isSlicing: boolean;
  onIsSlicingChange: (v: boolean) => void;
  sliceW: number;
  onSliceWChange: (n: number) => void;

  isCarving: boolean;
  onIsCarvingChange: (v: boolean) => void;
  showCarvedObject: boolean;
  onShowCarvedObjectChange: (v: boolean) => void;
  onClearCarvedPath: () => void;
  onExportCarvedObject: () => void;

  spriteTraversalEnabled: boolean;
  onSpriteTraversalEnabledChange: (v: boolean) => void;
  spriteDimension: SpriteDimension;
  onSpriteDimensionChange: (d: SpriteDimension) => void;
  spriteSpeed: number;
  onSpriteSpeedChange: (n: number) => void;

  hasSecureKey: boolean;
  keyPlanesAllowed: Plane[];
  trainingCompleted: boolean;
  onResetTraining: () => void;
}

const ToggleSwitch: React.FC<{
  label: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  highlight?: boolean;
}> = ({ label, enabled, onChange, highlight }) => (
  <div
    className={`flex items-center justify-between p-2 rounded-lg transition-all ${highlight ? 'bg-cyan-500/20 ring-2 ring-cyan-400' : ''}`}
  >
    <label
      htmlFor={`${label}-toggle`}
      className="text-sm font-bold text-gray-300"
    >
      {label}
    </label>
    <button
      id={`${label}-toggle`}
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-cyan-500 ${
        enabled ? 'bg-cyan-500' : 'bg-gray-600'
      }`}
      aria-pressed={enabled}
      role="switch"
    >
      <span
        className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  </div>
);

const NumberSlider: React.FC<{
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}> = ({ label, min, max, step, value, onChange }) => (
  <div>
    <label
      htmlFor={`${label}-slider`}
      className="block text-sm font-bold mb-2 text-gray-300"
    >
      {label}: {value.toFixed(2)}
    </label>
    <input
      id={`${label}-slider`}
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
    />
  </div>
);

const Controls: React.FC<ControlsProps> = (props) => {
  return (
    <div className="fixed bottom-4 left-4 z-20 bg-gray-900/70 backdrop-blur-sm text-white p-4 rounded-lg shadow-lg w-80 font-sans max-w-[calc(100vw-2rem)] max-h-[calc(100vh-5rem)] overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-cyan-300">Controls</h2>
        <div
          className="text-sm font-bold"
          aria-label="Secure Key status"
          title={props.hasSecureKey ? 'Secure Key present' : 'No Secure Key'}
        >
          {props.hasSecureKey ? '🔑 Acquired' : '🔒 No Key'}
        </div>
      </div>

      <div className="pt-2 mt-2 border-t border-gray-700 space-y-2">
        <h3 className="text-lg font-bold text-cyan-400">Dimensional Locking</h3>
        <div className="text-xs opacity-70 mb-1">Allowed Rotation Planes</div>
        <div className="flex flex-wrap gap-1">
          {(['XY', 'XZ', 'YZ', 'XW'] as Plane[]).map((p) => {
            const allowed = props.keyPlanesAllowed.includes(p);
            const isW = p.includes('W');

            if (allowed) {
              return (
                <span
                  key={p}
                  className="px-2 py-0.5 rounded border text-[11px] border-emerald-500/50 text-emerald-300"
                >
                  {p}
                </span>
              );
            } else if (isW && !props.hasSecureKey) {
              return (
                <span
                  key={p}
                  className="px-2 py-0.5 rounded border text-[11px] border-amber-500/50 text-amber-300"
                >
                  🔒 {p}
                </span>
              );
            } else {
              return (
                <span
                  key={p}
                  className="px-2 py-0.5 rounded border text-[11px] border-red-500/30 text-red-300/70 line-through"
                >
                  {p}
                </span>
              );
            }
          })}
        </div>
      </div>

      <div className="space-y-4 pt-4 mt-4 border-t border-gray-700">
        <div>
          <label className="block text-sm font-bold mb-2 text-gray-300">
            Network Model
          </label>
          <div className="flex flex-wrap gap-2">
            {shapeNames.map((name) => (
              <button
                key={name}
                onClick={() => props.onShapeChange(name)}
                className={`px-3 py-1 text-sm rounded transition-colors duration-200 ${props.shape === name ? 'bg-cyan-500 text-gray-900 font-bold' : 'bg-gray-700 hover:bg-gray-600'}`}
              >
                {' '}
                {name}{' '}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold mb-2 text-gray-300">
            Theme
          </label>
          <div className="flex flex-wrap gap-2">
            {themeNames.map((name) => (
              <button
                key={name}
                onClick={() => props.onThemeChange(name)}
                className={`px-3 py-1 text-sm rounded transition-colors duration-200 ${props.theme === name ? 'bg-cyan-500 text-gray-900 font-bold' : 'bg-gray-700 hover:bg-gray-600'}`}
              >
                {' '}
                {name}{' '}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="pt-4 mt-4 border-t border-gray-700 space-y-4">
        <h3 className="text-lg font-bold text-cyan-400">
          Flow & Sector Controls
        </h3>
        <ToggleSwitch
          label="Enable Braid"
          enabled={props.braidEnabled}
          onChange={props.onBraidEnabledChange}
        />
        {props.braidEnabled && (
          <>
            <div>
              <label
                htmlFor="braid-strands"
                className="block text-sm font-bold mb-2 text-gray-300"
              >
                Strands: {props.braidStrands}
              </label>
              <input
                id="braid-strands"
                type="range"
                min="2"
                max="8"
                step="1"
                value={props.braidStrands}
                onChange={(e) =>
                  props.onBraidStrandsChange(parseInt(e.target.value, 10))
                }
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>
          </>
        )}
      </div>

      <div className="pt-4 mt-4 border-t border-gray-700 space-y-4">
        <h3 className="text-lg font-bold text-cyan-400">Data Packages</h3>
        <ToggleSwitch
          label="Enable Packages"
          enabled={props.enableDataPackage}
          onChange={props.onEnableDataPackageChange}
        />
        {props.enableDataPackage && (
          <>
            <div>
              <label
                htmlFor="package-speed"
                className="block text-sm font-bold mb-2 text-gray-300"
              >
                Package Speed: {props.packageSpeed.toFixed(2)}
              </label>
              <input
                id="package-speed"
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={props.packageSpeed}
                onChange={(e) =>
                  props.onPackageSpeedChange(parseFloat(e.target.value))
                }
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>
          </>
        )}
      </div>

      <div className="pt-4 mt-4 border-t border-gray-700 space-y-4">
        <h3 className="text-lg font-bold text-cyan-400">Visuals & Effects</h3>
        <ToggleSwitch
          label="Cell Halos"
          enabled={props.cellHalo}
          onChange={props.onCellHaloChange}
        />
        <ToggleSwitch
          label="Lock Edge Colors"
          enabled={props.edgeColorLock}
          onChange={props.onEdgeColorLockChange}
        />
        <ToggleSwitch
          label="Glow / Bloom"
          enabled={props.glowEnabled}
          onChange={props.onGlowEnabledChange}
        />
        {props.glowEnabled && (
          <>
            <NumberSlider
              label="Bloom Strength"
              min={0}
              max={1}
              step={0.05}
              value={props.bloomStrength}
              onChange={props.onBloomStrengthChange}
            />
            <NumberSlider
              label="Halo Strength"
              min={0}
              max={1}
              step={0.05}
              value={props.haloStrength}
              onChange={props.onHaloStrengthChange}
            />
            <ToggleSwitch
              label="Additive Blend"
              enabled={props.additiveBlend}
              onChange={props.onAdditiveBlendChange}
            />
          </>
        )}
      </div>

      <div className="pt-4 mt-4 border-t border-gray-700 space-y-4">
        <h3 className="text-lg font-bold text-cyan-400">
          Geometric Exploration
        </h3>
        <ToggleSwitch
          label="Enable 3D Slice"
          enabled={props.isSlicing}
          onChange={props.onIsSlicingChange}
        />
        {props.isSlicing && (
          <>
            <NumberSlider
              label="Slice Position (W)"
              min={-1.5}
              max={1.5}
              step={0.01}
              value={props.sliceW}
              onChange={props.onSliceWChange}
            />
            <div className="p-2 border-t border-gray-700 space-y-2">
              <h4 className="font-bold text-cyan-500">Path Carver</h4>
              <ToggleSwitch
                label="Record Slice Path"
                enabled={props.isCarving}
                onChange={props.onIsCarvingChange}
              />
              <ToggleSwitch
                label="View Carved Object"
                enabled={props.showCarvedObject}
                onChange={props.onShowCarvedObjectChange}
              />
              <div className="flex gap-2">
                <button
                  onClick={props.onClearCarvedPath}
                  className="w-full bg-gray-700 text-white font-bold px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors text-sm"
                >
                  Clear
                </button>
                <button
                  onClick={props.onExportCarvedObject}
                  className="w-full bg-cyan-700 text-white font-bold px-4 py-2 rounded-lg hover:bg-cyan-600 transition-colors text-sm"
                >
                  Export .obj
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <div
        className={`pt-4 mt-4 border-t border-gray-700 space-y-4 transition-opacity ${!props.braidEnabled ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <h3 className="text-lg font-bold text-cyan-400">Dimensional Sprite</h3>
        {!props.braidEnabled && (
          <div className="text-xs text-amber-300 p-2 bg-amber-900/50 rounded-md">
            Requires "Enable Braid" to be active.
          </div>
        )}
        <ToggleSwitch
          label="Enable Sprite"
          enabled={props.spriteTraversalEnabled}
          onChange={props.onSpriteTraversalEnabledChange}
        />
        {props.spriteTraversalEnabled && (
          <>
            <div>
              <label className="block text-sm font-bold mb-2 text-gray-300">
                Traversal Axis
              </label>
              <div className="flex flex-wrap gap-2">
                {(['X', 'Y', 'Z', 'W'] as SpriteDimension[]).map((dim) => (
                  <button
                    key={dim}
                    onClick={() => props.onSpriteDimensionChange(dim)}
                    className={`px-3 py-1 text-sm rounded transition-colors duration-200 ${props.spriteDimension === dim ? 'bg-cyan-500 text-gray-900 font-bold' : 'bg-gray-700 hover:bg-gray-600'}`}
                  >
                    {dim}
                  </button>
                ))}
              </div>
            </div>
            <NumberSlider
              label="Sprite Speed"
              min={0.1}
              max={5}
              step={0.1}
              value={props.spriteSpeed}
              onChange={props.onSpriteSpeedChange}
            />
          </>
        )}
      </div>

      <div className="pt-4 mt-4 border-t border-gray-700 space-y-4">
        <h3 className="text-lg font-bold text-cyan-400">Training & Legend</h3>
        <ToggleSwitch
          label="Show Legend"
          enabled={props.showLegend}
          onChange={props.onShowLegendChange}
        />
        <button
          onClick={props.onResetTraining}
          className="w-full bg-amber-700 text-white font-bold px-4 py-2 rounded-lg hover:bg-amber-600 transition-colors text-sm"
        >
          Reset Training
        </button>
      </div>
    </div>
  );
};

export default Controls;
