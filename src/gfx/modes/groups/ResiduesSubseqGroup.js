import * as THREE from 'three';
import ResiduesGroup from './ResiduesGroup';
import CartoonHelper from './CartoonHelper';

function _createShape(rad, parts) {
  const pts = [];

  for (let i = 0; i < parts; ++i) {

    const a = 2 * i / parts * Math.PI;

    pts.push(new THREE.Vector3(Math.cos(a) * rad, Math.sin(a) * rad, 0));
  }
  return pts;
}

function _loopThrough(subDiv, residues, segmentsHeight, tension, mode, callback) {
  for (let subDivI = 0, subDivN = subDiv.length; subDivI < subDivN; ++subDivI) {
    const subs = subDiv[subDivI].arr;
    const boundaries = subDiv[subDivI].boundaries;
    for (let i = 0, n = subs.length; i < n; ++i) {
      const idc = [subs[i].start, subs[i].end];
      const matrixHelper = new CartoonHelper(residues, idc[0], idc[1], segmentsHeight, tension, boundaries);
      let prevLast = null;
      const startIdx = subs[i].start * 2;
      const endIdx = subs[i].end * 2 + 1;
      for (let idx = startIdx; idx <= endIdx; ++idx) {
        const resIdx = (idx / 2 | 0);
        const currRes = residues[resIdx];
        const firstRad = mode.getResidueRadius(currRes, idx % 2);
        const secondRad = mode.getResidueRadius(currRes, 1 + idx % 2);

        const mtc = matrixHelper.prepareMatrices(idx - idc[0] * 2, firstRad, secondRad);
        mtc.unshift(prevLast === null ? mtc[0] : prevLast);

        callback(currRes, mtc, resIdx);
        prevLast = mtc[segmentsHeight];
      }
    }
  }
}

class ResiduesSubseqGroup extends ResiduesGroup {
  _makeGeoArgs() {
    const cmpMultiplier = this._mode.getHeightSegmentsRatio();
    this._segmentsHeight = this._polyComplexity * cmpMultiplier | 0;
    return [_createShape(1.0, this._polyComplexity), this._segmentsHeight + 1, this._selection.chunks.length * 2];
  }

  _build() {
    const residues = this._selection.residues;
    const parent = this._selection.parent;
    const mode = this._mode;
    const colorer = this._colorer;
    const tension = mode.getTension();
    const geo = this._geo;
    let chunkIdx = 0;
    const chunkIdc = [];
    _loopThrough(this._selection.subdivs, residues, this._segmentsHeight, tension, mode, function(currRes, mtc) {
      const color = colorer.getResidueColor(currRes, parent);
      chunkIdc[chunkIdx] = currRes._index;
      geo.setItem(chunkIdx, mtc);
      geo.setColor(chunkIdx++, color);
    });
    this._chunksIdc = chunkIdc;
    geo.finalize();
  }

  updateToFrame(frameData) {
    // TODO This method looks like a copy paste. However, it
    // was decided to postpone animation refactoring until GFX is fixed.
    const parent = this._selection.parent;
    const mode = this._mode;
    const colorer = this._colorer;
    const tension = mode.getTension();
    const geo = this._geo;
    const frameRes = frameData.getResidues();
    let chunkIdx = 0;
    const updateColor = frameData.needsColorUpdate(colorer);
    _loopThrough(this._selection.subdivs, frameRes, this._segmentsHeight, tension, mode, function(currRes, mtc) {
      geo.setItem(chunkIdx, mtc);
      if (updateColor) {
        geo.setColor(chunkIdx, colorer.getResidueColor(currRes, parent));
      }
      chunkIdx++;
    });
    geo.finalize();
  }
}

export default ResiduesSubseqGroup;
