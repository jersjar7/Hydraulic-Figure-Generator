import { FileOutput, Images, LoaderCircle, Trash2 } from 'lucide-react'
import { useMemo, useRef, useState, type ChangeEvent } from 'react'
import '../../App.css'
import { flattenReportFigures } from '../../application/report-assembly/reportAssembly'
import { FigureEditorShell } from '../../components/editor/FigureEditorShell'
import type { ReportFigureArtifact } from '../../core/types'
import { FigurePicker } from '../figures/FigurePicker'
import { useHydraulicProjectWorkspace } from '../project-workspace/useHydraulicProjectWorkspace'
import { exportReportAssembly } from './exportReportAssembly'
import { ReportFigurePreview } from './ReportFigurePreview'
import { ReportWorkspaceRow } from './ReportWorkspaceRow'
import { useReportAssemblyProjectFiles } from './useReportAssemblyProjectFiles'

export function ReportAssemblyWorkspace() {
  const { reportAssembly } = useHydraulicProjectWorkspace()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [progress, setProgress] = useState({ completed: 0, total: 0 })
  const [status, setStatus] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const figures = useMemo(
    () => flattenReportFigures(reportAssembly.document),
    [reportAssembly.document],
  )
  const selected = figures.find((figure) => figure.id === selectedId) ?? null
  const projectFiles = useReportAssemblyProjectFiles({ reportAssembly, onStatus: setStatus })

  const load = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return
    if (await projectFiles.load(file)) setSelectedId(null)
  }
  const exportWord = async () => {
    if (exporting || figures.length === 0) return
    setExporting(true)
    setStatus('')
    setProgress({ completed: 0, total: figures.length })
    try {
      const result = await exportReportAssembly(
        reportAssembly.document,
        (completed, total) => setProgress({ completed, total }),
      )
      setStatus(`Exported ${result.pageCount} figures to Word.`)
    } catch (error) {
      setStatus(`Word export failed: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setExporting(false)
    }
  }
  const remove = (figureId: string) => {
    reportAssembly.removeFigure(figureId)
    if (selectedId === figureId) setSelectedId(null)
  }

  return (
    <FigureEditorShell
      inputsCollapsed={false}
      leftPanelOpen={false}
      rightPanelOpen={false}
      workspaceClassName="report-assembly-shell"
      showPanelButtons={false}
      onSave={projectFiles.save}
      onLoad={() => inputRef.current?.click()}
      onOpenLeftPanel={() => undefined}
      onOpenRightPanel={() => undefined}
      onCloseMobilePanels={() => undefined}
      loadInput={<input ref={inputRef} className="visually-hidden" type="file" accept=".hydreport,.json" onChange={load} />}
      figurePicker={<FigurePicker />}
    >
      <div className="report-assembly-page">
        <header className="report-assembly-toolbar">
          <div className="report-assembly-title">
            <Images size={20} aria-hidden="true" />
            <div><span className="eyebrow">Report assembly</span><h2>Export Collection</h2></div>
          </div>
          <label className="report-title-field"><span>Document title</span><input value={reportAssembly.document.title} onChange={(event) => reportAssembly.setTitle(event.currentTarget.value)} /></label>
          <span className="report-total">{figures.length} figure{figures.length === 1 ? '' : 's'}</span>
          {status ? <span className="report-status" role="status">{status}</span> : null}
          <button className="button secondary compact" type="button" disabled={figures.length === 0 || exporting} onClick={() => { if (window.confirm('Remove every figure from the Export Collection?')) reportAssembly.clear() }}><Trash2 size={15} /> Clear</button>
          <button className="button primary compact" type="button" disabled={figures.length === 0 || exporting} onClick={exportWord}>{exporting ? <LoaderCircle className="spin" size={16} /> : <FileOutput size={16} />}{exporting ? `Exporting ${progress.completed}/${progress.total}` : 'Export Word'}</button>
        </header>
        <div className="report-assembly-content">
          {reportAssembly.document.groups.length === 0 ? (
            <div className="report-assembly-empty"><Images size={34} /><h2>No figures added yet</h2><p>Generate a figure in any workspace and choose <strong>Add to export</strong>.</p></div>
          ) : reportAssembly.document.groups.map((group, index) => (
            <ReportWorkspaceRow
              key={group.workspaceId}
              group={group}
              groupIndex={index}
              groupCount={reportAssembly.document.groups.length}
              onOpen={(figure) => setSelectedId(figure.id)}
              onRemove={remove}
              onMoveFigure={(sourceId, targetId) => reportAssembly.moveFigure(group.workspaceId, sourceId, targetId)}
              onMoveFigureBy={(figureId, delta) => reportAssembly.moveFigureBy(group.workspaceId, figureId, delta)}
              onMoveWorkspace={reportAssembly.moveWorkspace}
              onMoveWorkspaceBy={(delta) => reportAssembly.moveWorkspaceBy(group.workspaceId, delta)}
            />
          ))}
        </div>
      </div>
      {selected ? <ReportFigurePreview figure={selected as ReportFigureArtifact} onChange={(update) => reportAssembly.updateFigure(selected.id, update)} onRemove={() => remove(selected.id)} onClose={() => setSelectedId(null)} /> : null}
    </FigureEditorShell>
  )
}
