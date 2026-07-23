import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Download,
  FileJson,
  FolderOpen,
  ImageDown,
  Layers3,
  Map,
  MapPin,
  PanelLeft,
  PanelRight,
  Palette,
  RefreshCcw,
  RotateCcw,
  Save,
  Settings2,
  SlidersHorizontal,
  UploadCloud,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from 'react'
import './App.css'
import { ControlSection } from './components/ControlSection'
import { DiagnosticsDrawer } from './components/DiagnosticsDrawer'
import { FileDrop } from './components/FileDrop'
import { HydraulicEngine, runDisplayName } from './core/hydraulicEngine'
import {
  DEFAULT_ELEMENT_POSITIONS,
  renderWseDifferenceMap,
} from './core/mapRenderer'
import { readShapefileOverlays } from './core/shapefile'
import type {
  Anchor,
  ConditionKey,
  FigureSettings,
  IngestNotice,
  MapElementKey,
  MapOverlay,
  WseDifferenceScene,
} from './core/types'

const DEFAULT_SETTINGS: FigureSettings = {
  orientation: 'landscape',
  dryDepth: 0.05,
  contourInterval: 0.5,
  contourColor: '#d92727',
  showContours: true,
  showWetDry: true,
  showOverlays: true,
  showTitle: true,
  showLegend: true,
  showNorth: true,
  showScale: true,
  titleTemplate: '{type} - {existing} vs {proposed}',
  legendBound: null,
  legendInterval: null,
  legendFontSize: 19,
  newlyWetColor: '#2cc88b',
  newlyDryColor: '#e97768',
  basemapOpacity: 0.72,
  rotation: 0,
  zoom: 1,
  panX: 0,
  panY: 0,
  elementPositions: structuredClone(DEFAULT_ELEMENT_POSITIONS),
}

const ANCHORS: { value: Anchor; label: string }[] = [
  { value: 'tl', label: 'Top left' },
  { value: 'tc', label: 'Top center' },
  { value: 'tr', label: 'Top right' },
  { value: 'ml', label: 'Middle left' },
  { value: 'mc', label: 'Center' },
  { value: 'mr', label: 'Middle right' },
  { value: 'bl', label: 'Bottom left' },
  { value: 'bc', label: 'Bottom center' },
  { value: 'br', label: 'Bottom right' },
]

const ELEMENTS: { key: MapElementKey; label: string }[] = [
  { key: 'title', label: 'Title' },
  { key: 'diffLegend', label: 'Difference legend' },
  { key: 'wetDry', label: 'Wet/dry key' },
  { key: 'north', label: 'North arrow' },
  { key: 'scale', label: 'Scale bar' },
]

const numeric = (value: string, fallback = 0) => {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function cloneDefaultSettings() {
  return {
    ...DEFAULT_SETTINGS,
    elementPositions: structuredClone(DEFAULT_ELEMENT_POSITIONS),
  }
}

function App() {
  const [engine] = useState(() => new HydraulicEngine())
  const [dataVersion, setDataVersion] = useState(0)
  const [settings, setSettings] = useState<FigureSettings>(cloneDefaultSettings)
  const [existingRun, setExistingRun] = useState(0)
  const [proposedRun, setProposedRun] = useState(0)
  const [overlays, setOverlays] = useState<MapOverlay[]>([])
  const [notices, setNotices] = useState<IngestNotice[]>([])
  const [scene, setScene] = useState<WseDifferenceScene | null>(null)
  const [busy, setBusy] = useState(false)
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false)
  const [leftOpen, setLeftOpen] = useState(false)
  const [rightOpen, setRightOpen] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const projectInputRef = useRef<HTMLInputElement>(null)
  const renderSequence = useRef(0)

  const existingCondition = engine.condition('EX')
  const proposedCondition = engine.condition('PR')
  const existingRuns = engine.runOptions('EX')
  const proposedRuns = engine.runOptions('PR')
  const ready = engine.isReady()

  const appendNotices = useCallback((incoming: IngestNotice[]) => {
    if (incoming.length === 0) return
    setNotices((current) => [...current, ...incoming].slice(-40))
    if (incoming.some((notice) => notice.level !== 'success')) {
      setDiagnosticsOpen(true)
    }
  }, [])

  const updateSettings = <Key extends keyof FigureSettings>(
    key: Key,
    value: FigureSettings[Key],
  ) => {
    setSettings((current) => ({ ...current, [key]: value }))
  }

  const handleH5Files = async (files: File[]) => {
    setBusy(true)
    setScene(null)
    try {
      const incoming = await engine.ingest(
        files.filter((file) => /\.h5$/i.test(file.name)),
      )
      appendNotices(incoming)
      setDataVersion((value) => value + 1)
    } finally {
      setBusy(false)
    }
  }

  const handleOverlayFiles = async (files: File[]) => {
    setBusy(true)
    try {
      const result = await readShapefileOverlays(
        files.filter((file) => /\.zip$/i.test(file.name)),
        overlays.length,
      )
      setOverlays((current) => [...current, ...result.overlays])
      appendNotices(result.notices)
    } finally {
      setBusy(false)
    }
  }

  const generateMap = () => {
    setBusy(true)
    try {
      const nextScene = engine.buildWseDifference(
        existingRun,
        proposedRun,
        settings.dryDepth,
      )
      if (nextScene.validDifferenceNodes === 0) {
        throw new Error(
          'The selected runs have no overlapping valid WSE values at this dry-depth threshold.',
        )
      }
      setScene(nextScene)
      appendNotices([
        {
          level: 'success',
          text: `WSE difference ready from ${nextScene.validDifferenceNodes.toLocaleString()} comparable Existing nodes. Proposed contours use the full Proposed mesh.`,
        },
      ])
      setLeftOpen(false)
      setRightOpen(false)
    } catch (error) {
      appendNotices([
        {
          level: 'error',
          text: error instanceof Error ? error.message : String(error),
        },
      ])
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (existingRun >= existingRuns.length) setExistingRun(0)
    if (proposedRun >= proposedRuns.length) setProposedRun(0)
  }, [dataVersion, existingRun, existingRuns.length, proposedRun, proposedRuns.length])

  useEffect(() => {
    if (!scene || !canvasRef.current) return
    const sequence = ++renderSequence.current
    setBusy(true)
    void renderWseDifferenceMap(
      canvasRef.current,
      scene,
      engine.commonBounds(),
      settings,
      overlays,
    )
      .catch((error) => {
        appendNotices([
          {
            level: 'error',
            text: `Map rendering failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ])
      })
      .finally(() => {
        if (renderSequence.current === sequence) setBusy(false)
      })
  }, [appendNotices, engine, overlays, scene, settings])

  const updateOverlay = (id: string, patch: Partial<MapOverlay>) => {
    setOverlays((current) =>
      current.map((overlay) =>
        overlay.id === id ? { ...overlay, ...patch } : overlay,
      ),
    )
  }

  const updateElementPosition = (
    key: MapElementKey,
    patch: Partial<FigureSettings['elementPositions'][MapElementKey]>,
  ) => {
    setSettings((current) => ({
      ...current,
      elementPositions: {
        ...current.elementPositions,
        [key]: { ...current.elementPositions[key], ...patch },
      },
    }))
  }

  const nudgeElement = (key: MapElementKey, dx: number, dy: number) => {
    const position = settings.elementPositions[key]
    updateElementPosition(key, {
      offX: position.offX + dx,
      offY: position.offY + dy,
    })
  }

  const resetView = () => {
    setSettings((current) => ({
      ...current,
      rotation: 0,
      zoom: 1,
      panX: 0,
      panY: 0,
    }))
  }

  const resetProject = () => {
    engine.reset()
    setDataVersion((value) => value + 1)
    setOverlays([])
    setScene(null)
    setNotices([])
    setExistingRun(0)
    setProposedRun(0)
    setSettings(cloneDefaultSettings())
  }

  const downloadMap = () => {
    const canvas = canvasRef.current
    if (!canvas || !scene) return
    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `FRA_WSE_Difference_${runDisplayName(scene.existing.run.name).replace(/\s+/g, '_')}_${runDisplayName(scene.proposed.run.name).replace(/\s+/g, '_')}.png`
      anchor.click()
      URL.revokeObjectURL(url)
    }, 'image/png')
  }

  const saveProject = () => {
    const project = {
      version: 1,
      figure: 'fra-wse-difference',
      settings,
      overlays,
      selectedRuns: { existingRun, proposedRun },
    }
    const blob = new Blob([JSON.stringify(project, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'Hydraulic_Figure_Project.hydfig'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const loadProject = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return
    try {
      const project = JSON.parse(await file.text()) as {
        settings?: Partial<FigureSettings>
        overlays?: MapOverlay[]
        selectedRuns?: { existingRun?: number; proposedRun?: number }
      }
      if (project.settings) {
        setSettings((current) => ({
          ...current,
          ...project.settings,
          elementPositions: {
            ...current.elementPositions,
            ...(project.settings?.elementPositions ?? {}),
          },
        }))
      }
      if (Array.isArray(project.overlays)) setOverlays(project.overlays)
      setExistingRun(project.selectedRuns?.existingRun ?? 0)
      setProposedRun(project.selectedRuns?.proposedRun ?? 0)
      setScene(null)
      appendNotices([
        {
          level: 'success',
          text: 'Project settings loaded. Re-add the H5 files to regenerate the map.',
        },
      ])
    } catch (error) {
      appendNotices([
        {
          level: 'error',
          text: `Project could not be loaded: ${error instanceof Error ? error.message : String(error)}`,
        },
      ])
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <Map size={20} />
          </div>
          <div>
            <h1>Hydraulic Figure Generator</h1>
            <p>FRA workspace · WSE difference</p>
          </div>
        </div>
        <div className="topbar-actions">
          <button className="button secondary compact" type="button" onClick={saveProject}>
            <Save size={16} aria-hidden="true" />
            <span>Save</span>
          </button>
          <button
            className="button secondary compact"
            type="button"
            onClick={() => projectInputRef.current?.click()}
          >
            <FolderOpen size={16} aria-hidden="true" />
            <span>Load</span>
          </button>
          <button
            className="icon-button mobile-panel-button"
            type="button"
            title="Open project data"
            aria-label="Open project data"
            onClick={() => setLeftOpen(true)}
          >
            <PanelLeft size={19} />
          </button>
          <button
            className="icon-button mobile-panel-button"
            type="button"
            title="Open figure settings"
            aria-label="Open figure settings"
            onClick={() => setRightOpen(true)}
          >
            <PanelRight size={19} />
          </button>
          <input
            ref={projectInputRef}
            className="visually-hidden"
            type="file"
            accept=".hydfig,.json"
            onChange={loadProject}
          />
        </div>
      </header>

      <main className="workspace">
        <aside className={`sidebar left-sidebar${leftOpen ? ' is-mobile-open' : ''}`}>
          <div className="sidebar-heading">
            <div>
              <span className="eyebrow">Inputs</span>
              <h2>Project data</h2>
            </div>
            <button
              className="icon-button mobile-close"
              type="button"
              title="Close project data"
              aria-label="Close project data"
              onClick={() => setLeftOpen(false)}
            >
              <X size={18} />
            </button>
          </div>

          <section className="sidebar-block">
            <div className="block-title">
              <UploadCloud size={17} aria-hidden="true" />
              <span>SMS mesh and results</span>
              <span className="file-chip">.h5</span>
            </div>
            <FileDrop
              accept=".h5"
              title="Add geometry + datasets"
              description="Existing and Proposed, any order"
              disabled={busy}
              testId="h5-file-drop"
              onFiles={handleH5Files}
            />
            <div className="condition-list">
              <ConditionStatus
                label="Existing"
                conditionKey="EX"
                geometryName={existingCondition?.geometryFileName}
                datasetName={existingCondition?.datasetFileName}
                nodeCount={existingCondition?.projected?.N}
                runCount={existingCondition?.datasets?.runs.length}
              />
              <ConditionStatus
                label="Proposed"
                conditionKey="PR"
                geometryName={proposedCondition?.geometryFileName}
                datasetName={proposedCondition?.datasetFileName}
                nodeCount={proposedCondition?.projected?.N}
                runCount={proposedCondition?.datasets?.runs.length}
              />
            </div>
          </section>

          <section className="sidebar-block">
            <div className="block-title">
              <RefreshCcw size={17} aria-hidden="true" />
              <span>Run pairing</span>
            </div>
            <label className="field">
              <span>Existing run</span>
              <select
                value={existingRun}
                disabled={existingRuns.length === 0}
                onChange={(event) => {
                  setExistingRun(Number(event.target.value))
                  setScene(null)
                }}
              >
                {existingRuns.length === 0 ? (
                  <option>Waiting for Existing files</option>
                ) : (
                  existingRuns.map((selection) => (
                    <option key={selection.index} value={selection.index}>
                      {runDisplayName(selection.run.name)}
                    </option>
                  ))
                )}
              </select>
            </label>
            <label className="field">
              <span>Proposed run</span>
              <select
                value={proposedRun}
                disabled={proposedRuns.length === 0}
                onChange={(event) => {
                  setProposedRun(Number(event.target.value))
                  setScene(null)
                }}
              >
                {proposedRuns.length === 0 ? (
                  <option>Waiting for Proposed files</option>
                ) : (
                  proposedRuns.map((selection) => (
                    <option key={selection.index} value={selection.index}>
                      {runDisplayName(selection.run.name)}
                    </option>
                  ))
                )}
              </select>
            </label>
          </section>

          <section className="sidebar-block overlay-block">
            <div className="block-title">
              <Layers3 size={17} aria-hidden="true" />
              <span>Map overlays</span>
              <span className="file-chip">.zip</span>
            </div>
            <FileDrop
              accept=".zip"
              title="Add zipped shapefiles"
              description="Centerlines, ROW, project limits"
              disabled={busy}
              testId="overlay-file-drop"
              onFiles={handleOverlayFiles}
            />
            {overlays.length === 0 ? (
              <p className="empty-note">No shapefile overlays loaded.</p>
            ) : (
              <div className="overlay-list">
                {overlays.map((overlay) => (
                  <div className="overlay-row" key={overlay.id}>
                    <label className="overlay-visible">
                      <input
                        type="checkbox"
                        checked={overlay.visible}
                        onChange={(event) =>
                          updateOverlay(overlay.id, {
                            visible: event.target.checked,
                          })
                        }
                      />
                      <span title={overlay.name}>{overlay.name}</span>
                    </label>
                    <input
                      type="color"
                      value={overlay.color}
                      aria-label={`${overlay.name} color`}
                      onChange={(event) =>
                        updateOverlay(overlay.id, { color: event.target.value })
                      }
                    />
                    <input
                      className="width-input"
                      type="number"
                      min="1"
                      max="12"
                      step="0.5"
                      value={overlay.width}
                      aria-label={`${overlay.name} line width`}
                      onChange={(event) =>
                        updateOverlay(overlay.id, {
                          width: numeric(event.target.value, 3),
                        })
                      }
                    />
                    <button
                      className="icon-button small danger"
                      type="button"
                      title={`Remove ${overlay.name}`}
                      aria-label={`Remove ${overlay.name}`}
                      onClick={() =>
                        setOverlays((current) =>
                          current.filter((item) => item.id !== overlay.id),
                        )
                      }
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <button className="text-button reset-project" type="button" onClick={resetProject}>
            <RotateCcw size={15} aria-hidden="true" />
            Reset project
          </button>
        </aside>

        <section className="map-workspace">
          <div className="map-toolbar">
            <div className="map-mode">
              <span className="mode-dot" />
              <strong>WSE Difference</strong>
              <span>Proposed minus Existing</span>
            </div>
            <div className="map-toolbar-actions">
              <button
                className="icon-button"
                type="button"
                title="Zoom out"
                aria-label="Zoom out"
                onClick={() =>
                  updateSettings('zoom', Math.max(0.35, settings.zoom - 0.1))
                }
              >
                <ZoomOut size={18} />
              </button>
              <button
                className="icon-button"
                type="button"
                title="Zoom in"
                aria-label="Zoom in"
                onClick={() =>
                  updateSettings('zoom', Math.min(4, settings.zoom + 0.1))
                }
              >
                <ZoomIn size={18} />
              </button>
              <button
                className="icon-button"
                type="button"
                title="Fit map to frame"
                aria-label="Fit map to frame"
                onClick={resetView}
              >
                <RefreshCcw size={18} />
              </button>
            </div>
          </div>

          <div className="map-stage">
            {!scene ? (
              <div className="map-empty">
                <div className="empty-symbol">
                  <MapPin size={28} />
                </div>
                <h2>Build an FRA WSE difference figure</h2>
                <p>
                  Add Existing and Proposed geometry and datasets on the left,
                  pair the runs, then generate the map.
                </p>
                <button
                  className="button primary"
                  type="button"
                  disabled={!ready || busy}
                  data-testid="generate-empty-map"
                  onClick={generateMap}
                >
                  <Map size={17} aria-hidden="true" />
                  Generate WSE difference
                </button>
              </div>
            ) : null}
            <canvas
              ref={canvasRef}
              className={scene ? 'map-canvas is-visible' : 'map-canvas'}
              aria-label="Generated WSE difference figure"
            />
            {busy ? (
              <div className="map-busy" role="status">
                <span className="spinner" />
                Processing figure
              </div>
            ) : null}
            <DiagnosticsDrawer
              notices={notices}
              open={diagnosticsOpen}
              onToggle={() => setDiagnosticsOpen((value) => !value)}
            />
          </div>
        </section>

        <aside className={`sidebar right-sidebar${rightOpen ? ' is-mobile-open' : ''}`}>
          <div className="sidebar-heading">
            <div>
              <span className="eyebrow">Output</span>
              <h2>Figure settings</h2>
            </div>
            <button
              className="icon-button mobile-close"
              type="button"
              title="Close figure settings"
              aria-label="Close figure settings"
              onClick={() => setRightOpen(false)}
            >
              <X size={18} />
            </button>
          </div>

          <div className="right-scroll">
            <ControlSection
              icon={<Settings2 size={17} />}
              title="Map calculation"
              badge="FRA"
            >
              <label className="field">
                <span>
                  Dry-depth threshold
                  <small>ft</small>
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={settings.dryDepth}
                  onChange={(event) => {
                    updateSettings(
                      'dryDepth',
                      numeric(event.target.value, DEFAULT_SETTINGS.dryDepth),
                    )
                    setScene(null)
                  }}
                />
              </label>
              <p className="field-help">
                Depths at or below this value are treated as dry for wet/dry
                classification.
              </p>
              <Toggle
                label="Newly wet/dry fill"
                checked={settings.showWetDry}
                onChange={(checked) => updateSettings('showWetDry', checked)}
              />
              <Toggle
                label="Proposed WSE contours"
                checked={settings.showContours}
                onChange={(checked) => updateSettings('showContours', checked)}
              />
              <div className="field-grid two">
                <label className="field">
                  <span>Contour interval <small>ft</small></span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.1"
                    value={settings.contourInterval}
                    onChange={(event) =>
                      updateSettings(
                        'contourInterval',
                        numeric(event.target.value, 0.5),
                      )
                    }
                  />
                </label>
                <label className="field color-field">
                  <span>Contour color</span>
                  <input
                    type="color"
                    value={settings.contourColor}
                    onChange={(event) =>
                      updateSettings('contourColor', event.target.value)
                    }
                  />
                </label>
              </div>
            </ControlSection>

            <ControlSection
              icon={<Palette size={17} />}
              title="Legend and colors"
            >
              <div className="field-grid two">
                <label className="field">
                  <span>Symmetric bound <small>± ft</small></span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.25"
                    placeholder="Auto"
                    value={settings.legendBound ?? ''}
                    onChange={(event) =>
                      updateSettings(
                        'legendBound',
                        event.target.value
                          ? numeric(event.target.value, 3)
                          : null,
                      )
                    }
                  />
                </label>
                <label className="field">
                  <span>Legend interval <small>ft</small></span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.1"
                    placeholder="Auto"
                    value={settings.legendInterval ?? ''}
                    onChange={(event) =>
                      updateSettings(
                        'legendInterval',
                        event.target.value
                          ? numeric(event.target.value, 0.5)
                          : null,
                      )
                    }
                  />
                </label>
              </div>
              <label className="field">
                <span>Legend text size <small>px</small></span>
                <input
                  type="number"
                  min="10"
                  max="34"
                  value={settings.legendFontSize}
                  onChange={(event) =>
                    updateSettings(
                      'legendFontSize',
                      numeric(event.target.value, 19),
                    )
                  }
                />
              </label>
              <div className="field-grid two">
                <label className="field color-field">
                  <span>Newly inundated</span>
                  <input
                    type="color"
                    value={settings.newlyWetColor}
                    onChange={(event) =>
                      updateSettings('newlyWetColor', event.target.value)
                    }
                  />
                </label>
                <label className="field color-field">
                  <span>Newly dry</span>
                  <input
                    type="color"
                    value={settings.newlyDryColor}
                    onChange={(event) =>
                      updateSettings('newlyDryColor', event.target.value)
                    }
                  />
                </label>
              </div>
            </ControlSection>

            <ControlSection
              icon={<SlidersHorizontal size={17} />}
              title="Frame and view"
            >
              <div className="segmented" aria-label="Figure orientation">
                <button
                  type="button"
                  className={settings.orientation === 'landscape' ? 'active' : ''}
                  onClick={() => updateSettings('orientation', 'landscape')}
                >
                  Landscape
                </button>
                <button
                  type="button"
                  className={settings.orientation === 'portrait' ? 'active' : ''}
                  onClick={() => updateSettings('orientation', 'portrait')}
                >
                  Portrait
                </button>
              </div>
              <label className="range-field">
                <span>
                  Rotation <output>{settings.rotation.toFixed(0)}°</output>
                </span>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  step="1"
                  value={settings.rotation}
                  onChange={(event) =>
                    updateSettings('rotation', numeric(event.target.value))
                  }
                />
              </label>
              <label className="range-field">
                <span>
                  Zoom <output>{settings.zoom.toFixed(2)}×</output>
                </span>
                <input
                  type="range"
                  min="0.35"
                  max="4"
                  step="0.05"
                  value={settings.zoom}
                  onChange={(event) =>
                    updateSettings('zoom', numeric(event.target.value, 1))
                  }
                />
              </label>
              <label className="range-field">
                <span>
                  Aerial opacity{' '}
                  <output>{Math.round(settings.basemapOpacity * 100)}%</output>
                </span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.basemapOpacity}
                  onChange={(event) =>
                    updateSettings(
                      'basemapOpacity',
                      numeric(event.target.value, 0.72),
                    )
                  }
                />
              </label>
              <div className="nudge-control map-pan">
                <span>Pan map</span>
                <div className="nudge-buttons">
                  <NudgeButton
                    label="Pan left"
                    icon={<ArrowLeft size={15} />}
                    onClick={() => updateSettings('panX', settings.panX - 30)}
                  />
                  <NudgeButton
                    label="Pan up"
                    icon={<ArrowUp size={15} />}
                    onClick={() => updateSettings('panY', settings.panY - 30)}
                  />
                  <NudgeButton
                    label="Pan down"
                    icon={<ArrowDown size={15} />}
                    onClick={() => updateSettings('panY', settings.panY + 30)}
                  />
                  <NudgeButton
                    label="Pan right"
                    icon={<ArrowRight size={15} />}
                    onClick={() => updateSettings('panX', settings.panX + 30)}
                  />
                  <NudgeButton
                    label="Reset view"
                    icon={<RefreshCcw size={15} />}
                    onClick={resetView}
                  />
                </div>
              </div>
            </ControlSection>

            <ControlSection
              icon={<MapPin size={17} />}
              title="Figure elements"
            >
              <Toggle
                label="Title"
                checked={settings.showTitle}
                onChange={(checked) => updateSettings('showTitle', checked)}
              />
              <Toggle
                label="WSE difference legend"
                checked={settings.showLegend}
                onChange={(checked) => updateSettings('showLegend', checked)}
              />
              <Toggle
                label="North arrow"
                checked={settings.showNorth}
                onChange={(checked) => updateSettings('showNorth', checked)}
              />
              <Toggle
                label="Scale bar"
                checked={settings.showScale}
                onChange={(checked) => updateSettings('showScale', checked)}
              />
              <Toggle
                label="Shapefile overlays"
                checked={settings.showOverlays}
                onChange={(checked) => updateSettings('showOverlays', checked)}
              />
              <label className="field">
                <span>Figure title</span>
                <input
                  type="text"
                  value={settings.titleTemplate}
                  onChange={(event) =>
                    updateSettings('titleTemplate', event.target.value)
                  }
                />
              </label>
              <p className="field-help">
                Available fields: {'{type}'}, {'{existing}'}, {'{proposed}'}
              </p>
              <div className="element-list">
                {ELEMENTS.map((element) => {
                  const position = settings.elementPositions[element.key]
                  return (
                    <div className="element-row" key={element.key}>
                      <div className="element-row-heading">
                        <strong>{element.label}</strong>
                        <span>
                          {position.offX}, {position.offY}
                        </span>
                      </div>
                      <select
                        aria-label={`${element.label} anchor`}
                        value={position.anchor}
                        onChange={(event) =>
                          updateElementPosition(element.key, {
                            anchor: event.target.value as Anchor,
                          })
                        }
                      >
                        {ANCHORS.map((anchor) => (
                          <option value={anchor.value} key={anchor.value}>
                            {anchor.label}
                          </option>
                        ))}
                      </select>
                      <div className="nudge-buttons">
                        <NudgeButton
                          label={`Move ${element.label} left`}
                          icon={<ArrowLeft size={14} />}
                          onClick={() => nudgeElement(element.key, -10, 0)}
                        />
                        <NudgeButton
                          label={`Move ${element.label} up`}
                          icon={<ArrowUp size={14} />}
                          onClick={() => nudgeElement(element.key, 0, -10)}
                        />
                        <NudgeButton
                          label={`Move ${element.label} down`}
                          icon={<ArrowDown size={14} />}
                          onClick={() => nudgeElement(element.key, 0, 10)}
                        />
                        <NudgeButton
                          label={`Move ${element.label} right`}
                          icon={<ArrowRight size={14} />}
                          onClick={() => nudgeElement(element.key, 10, 0)}
                        />
                        <NudgeButton
                          label={`Reset ${element.label}`}
                          icon={<RotateCcw size={14} />}
                          onClick={() =>
                            updateElementPosition(
                              element.key,
                              DEFAULT_ELEMENT_POSITIONS[element.key],
                            )
                          }
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </ControlSection>

            <ControlSection
              icon={<ImageDown size={17} />}
              title="Export"
            >
              <div className="export-note">
                <FileJson size={17} aria-hidden="true" />
                <span>
                  Project files retain figure settings and overlays. H5 files
                  remain local and must be re-added.
                </span>
              </div>
              <button
                className="button secondary full"
                type="button"
                disabled={!scene}
                onClick={downloadMap}
              >
                <Download size={17} aria-hidden="true" />
                Download map PNG
              </button>
            </ControlSection>
          </div>

          <div className="generate-bar">
            <button
              className="button primary full"
              type="button"
              disabled={!ready || busy}
              data-testid="generate-map"
              onClick={generateMap}
            >
              <Map size={18} aria-hidden="true" />
              {scene ? 'Regenerate map' : 'Generate map'}
            </button>
            {!ready ? (
              <span className="generate-hint">
                <AlertCircle size={14} aria-hidden="true" />
                Add both conditions first
              </span>
            ) : null}
          </div>
        </aside>
      </main>

      {(leftOpen || rightOpen) && (
        <button
          type="button"
          className="mobile-scrim"
          aria-label="Close side panel"
          onClick={() => {
            setLeftOpen(false)
            setRightOpen(false)
          }}
        />
      )}
    </div>
  )
}

type ConditionStatusProps = {
  label: string
  conditionKey: ConditionKey
  geometryName?: string
  datasetName?: string
  nodeCount?: number
  runCount?: number
}

function ConditionStatus({
  label,
  conditionKey,
  geometryName,
  datasetName,
  nodeCount,
  runCount,
}: ConditionStatusProps) {
  const complete = Boolean(geometryName && datasetName)
  return (
    <div className={`condition-row${complete ? ' complete' : ''}`}>
      <div className="condition-name">
        <span className={`condition-code ${conditionKey.toLowerCase()}`}>
          {conditionKey}
        </span>
        <strong>{label}</strong>
      </div>
      <div className="condition-badges">
        <span
          className={geometryName ? 'status-badge ready' : 'status-badge'}
          title={geometryName}
        >
          {geometryName ? `${nodeCount?.toLocaleString()} nodes` : 'geometry'}
        </span>
        <span
          className={datasetName ? 'status-badge ready' : 'status-badge'}
          title={datasetName}
        >
          {datasetName ? `${runCount} runs` : 'datasets'}
        </span>
      </div>
    </div>
  )
}

type ToggleProps = {
  label: string
  checked: boolean
  onChange(checked: boolean): void
}

function Toggle({ label, checked, onChange }: ToggleProps) {
  return (
    <label className="toggle-row">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="toggle-track" aria-hidden="true">
        <span />
      </span>
    </label>
  )
}

type NudgeButtonProps = {
  label: string
  icon: React.ReactNode
  onClick(): void
}

function NudgeButton({ label, icon, onClick }: NudgeButtonProps) {
  return (
    <button
      className="icon-button tiny"
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
    >
      {icon}
    </button>
  )
}

export default App
