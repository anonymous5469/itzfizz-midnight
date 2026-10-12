// The unchanged SVG has a 520-unit viewBox. Its painted nose reaches x=504;
// the remaining transparent padding must not reveal text ahead of the bumper.
// This asset-space ratio scales with the measured car width at every viewport.
export const carFrontRatio = 504 / 520;
