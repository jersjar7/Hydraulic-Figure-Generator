import { describe, it } from 'node:test'
import { PROJECT_WORKFLOW_MODULES } from '../src/components/project-data/projectWorkflowRegistry'
import { WSE_DIFFERENCE_RENDER_LAYERS } from '../src/core/map/wseDifferenceRenderLayers'
import { WSE_ANNOTATION_TOOLS } from '../src/features/wse-difference/annotationTools'
import { wseDifferenceFigure } from '../src/features/wse-difference/wseDifferenceFigure'
import { crossSectionFigure } from '../src/features/cross-section/crossSectionFigure'
import { WSE_SETTINGS_SECTIONS } from '../src/features/wse-difference/wseSettingsSections'
import {
  assertEditorToolContract,
  assertFigureModuleContract,
  assertProjectWorkflowContract,
  assertRenderLayerContract,
  assertSettingsSectionContract,
} from './support/extensionContracts'

describe('extension contracts', () => {
  it('accepts the registered WSE figure module', () => {
    assertFigureModuleContract(wseDifferenceFigure)
    assertFigureModuleContract(crossSectionFigure)
  })

  it('accepts the registered editor tools and settings sections', () => {
    assertEditorToolContract(WSE_ANNOTATION_TOOLS)
    assertSettingsSectionContract(WSE_SETTINGS_SECTIONS)
  })

  it('accepts the project workflows and ordered render layers', () => {
    assertProjectWorkflowContract(PROJECT_WORKFLOW_MODULES)
    assertRenderLayerContract(WSE_DIFFERENCE_RENDER_LAYERS)
  })
})
