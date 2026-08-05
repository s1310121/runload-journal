// Regional A3 source-bounded route data.
// Values are preserved-source endpoint ratios, not free calibration parameters.

export const JOINT_GRADE_SOURCE = Object.freeze({
  sourceId: "SRC-SUP-003",
  speedMps: 2.25,
  speedToleranceFraction: 0.05,
  runSetting: "TREADMILL",
  gradeDegrees: [-5.71, -2.86, 0, 2.86, 5.71],
  regions: Object.freeze({
    "BA-DISP-014": Object.freeze({
      endpoint: "hip joint mechanical work route: absolute negative power for decline and positive power for incline, each normalized to its level value",
      rawValuesWPerKg: [0.37, 0.29, 0.15, 1.39, 1.63],
      rawReferenceValuesWPerKg: { declineNegativeMagnitude: 0.15, inclinePositive: 1.02 },
      ratios: [2.466666666666667, 1.933333333333333, 1, 1.362745098039216, 1.598039215686275],
      coverageState: "FULL",
      sourceAnchorRange: "RCM-ANCH-A3-001..005",
    }),
    "BA-DISP-016": Object.freeze({
      endpoint: "magnitude of negative knee joint power normalized to level; anterior-thigh proxy",
      rawValuesWPerKg: [2.40, 1.98, 1.83, 1.57, 1.52],
      rawReferenceValueWPerKg: 1.83,
      ratios: [1.311475409836066, 1.081967213114754, 1, 0.857923497267760, 0.830601092896175],
      coverageState: "PARTIAL",
      sourceAnchorRange: "RCM-ANCH-A3-006..010",
    }),
    "BA-DISP-024": Object.freeze({
      endpoint: "positive plus absolute negative ankle joint power normalized to level",
      rawValuesWPerKg: [2.40, 2.52, 3.14, 3.19, 3.18],
      rawReferenceValueWPerKg: 3.14,
      ratios: [0.764331210191083, 0.802547770700637, 1, 1.015923566878981, 1.012738853503185],
      coverageState: "FULL",
      sourceAnchorRange: "RCM-ANCH-A3-011..015",
    }),
  }),
});

// Heiderscheit et al. 2011, Table 2. Raw ratios are total absolute joint work
// (absorbed + generated) relative to the source preferred-cadence condition.
// The table is normalized again at the model reference cadence (170 spm) so
// Reference 100 remains stable. This is a declared coordinate transform, not
// a fitted personal cadence prescription.
export const CADENCE_JOINT_WORK_SOURCE = Object.freeze({
  sourceId: "E04",
  runSetting: "TREADMILL",
  speedDomainMps: [2.4, 3.4],
  cadenceSpm: [155.34, 163.97, 172.6, 181.23, 189.86],
  referenceCadenceSpm: 170,
  regions: Object.freeze({
    "BA-DISP-014": Object.freeze({
      endpoint: "hip total absolute mechanical work",
      rawTotalWorkJPerKg: [5.8, 4.7, 4.0, 3.7, 3.3],
      rawAtModelReferenceJPerKg: 4.210892236384704,
      ratiosAtModelReference: [1.377380297193176, 1.116152999449642, 0.949917446340121, 0.878673637864612, 0.783681893230600],
      coverageState: "PARTIAL",
      validSpeedDomainMps: [2, 5],
      sourceAnchorRange: "RCM-ANCH-A3-016..020",
    }),
    "BA-DISP-016": Object.freeze({
      endpoint: "knee total absolute mechanical work; anterior-thigh proxy",
      rawTotalWorkJPerKg: [27.3, 23.4, 20.5, 16.7, 14.5],
      rawAtModelReferenceJPerKg: 21.37369640787949,
      ratiosAtModelReference: [1.277270879076198, 1.094803610636741, 0.959122821284324, 0.781334200753571, 0.678403946762083],
      coverageState: "PARTIAL",
      sourceAnchorRange: "RCM-ANCH-A3-021..025",
    }),
    "BA-DISP-024": Object.freeze({
      endpoint: "ankle total absolute mechanical work",
      rawTotalWorkJPerKg: [32.9, 29.0, 26.0, 24.5, 22.7],
      rawAtModelReferenceJPerKg: 26.90382387022016,
      ratiosAtModelReference: [1.222874493927125, 1.077913687656129, 0.966405375139978, 0.910651218881902, 0.843746231372211],
      coverageState: "PARTIAL",
      validSpeedDomainMps: [2, 5],
      sourceAnchorRange: "RCM-ANCH-A3-026..030",
    }),
  }),
});

// BAT-SRC-009 exact fixed-speed uphill protocol. Vastus medialis EMG was
// reduced by 35.22% at 2% grade and 37.14% at 7% grade relative to level.
export const VASTUS_MEDIALIS_UPHILL_SOURCE = Object.freeze({
  sourceId: "BAT-SRC-009",
  speedMps: 4.17,
  speedToleranceFraction: 0.05,
  gradePercent: [0, 2, 7],
  ratios: [1, 0.6478, 0.6286],
  endpoint: "vastus medialis EMG amplitude normalized to level",
  sourceAnchorRange: "RCM-ANCH-A3-031..033",
});

// E02 / Hamner et al. 2013 Figure 5. Values were digitized from the preserved
// vector/raster figure and checked against the article's reported across-speed
// differences. They are functional-contribution proxies, not direct muscle
// force or tissue load. Restrict to level treadmill running at 2–5 m/s.
export const FIGURE_DIGITIZED_SPEED_SOURCE = Object.freeze({
  sourceId: "E02",
  runSetting: "TREADMILL",
  speedMps: [2, 3, 4, 5],
  sourceCadenceSpm: [159.574468085106, 167.832167832168, 178.571428571429, 193.861066235864],
  cadenceToleranceFraction: 0.05,
  referenceSpeedMps: 2.78,
  digitizationUncertaintyMps2: 0.08,
  regions: Object.freeze({
    "BA-DISP-015": Object.freeze({
      endpoint: "gluteus maximus peak upward COM-acceleration contribution",
      rawValuesMps2: [0.51, 0.748, 0.984, 1.299],
      ratiosAtModelReference: [0.733137829912, 1.075268817204, 1.414524754183, 1.867345178541],
      coverageState: "PARTIAL",
      sourceAnchorRange: "RCM-ANCH-A3-034..037",
    }),
    "BA-DISP-016": Object.freeze({
      endpoint: "vasti plus rectus femoris peak upward COM-acceleration contribution",
      rawValuesMps2: [2.32, 2.52, 2.716, 3.11],
      ratiosAtModelReference: [0.936995153473, 1.017770597738, 1.096930533118, 1.25605815832],
      coverageState: "PARTIAL",
      validSpeedDomainMps: [4, 5],
      sourceAnchorRange: "RCM-ANCH-A3-038..039",
    }),
    "BA-DISP-023": Object.freeze({
      endpoint: "soleus plus gastrocnemius peak upward COM-acceleration contribution",
      rawValuesMps2: [15.748, 18.976, 20.748, 22.441],
      ratiosAtModelReference: [0.862155805591, 1.038879131756, 1.135890821336, 1.228577497668],
      coverageState: "PARTIAL",
      sourceAnchorRange: "RCM-ANCH-A3-040..043",
    }),
  }),
});
