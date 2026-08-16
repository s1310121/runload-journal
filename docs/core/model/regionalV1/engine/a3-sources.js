// Regional A3 source-bounded route data.
// Values are preserved-source endpoint ratios, not free calibration parameters.

export const JOINT_GRADE_SOURCE = Object.freeze({
  sourceId: "SRC-SUP-003",
  speedMps: 2.25,
  speedMatchEpsilonMps: 1e-9,
  historicalSpeedToleranceFraction: 0.05, // retired R19; not used by numeric routing
  runSetting: "TREADMILL",
  gradePercent: [-10, -5, 0, 5, 10],
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

// Historical A6 beginner-grade transfer policy registry. R19 retires this
// policy from numeric runtime use because the supporting studies corroborate
// slope/environment context but do not quantitatively calibrate the Nuckols
// 2.25 m/s treadmill joint-power magnitude across 1.8-2.5 m/s or outdoors.
// The object is retained only so earlier A6 decisions remain auditable.
export const A6_BEGINNER_GRADE_TRANSFER_POLICY = Object.freeze({
  policyId: "A6-GRADE-TRANSFER-001",
  status: "RETIRED_R19",
  numericRuntimeEligible: false,
  sourceId: "SRC-SUP-003",
  sourceDoi: "10.1371/journal.pone.0231996",
  speedDomainMps: Object.freeze([1.8, 2.5]),
  gradeDegrees: Object.freeze([-5.71, -2.86, 0, 2.86, 5.71]),
  allowedRunSettings: Object.freeze(["TREADMILL", "OUTDOOR_ROUTE", "TRACK"]),
  stableOutdoorRequirements: Object.freeze({ maxUnevennessLevel: 1, maxSinkLevel: 1, minStabilityLevel: 4 }),
  supportingSources: Object.freeze([
    Object.freeze({ sourceId: "SRC-A6-001", doi: "10.1371/journal.pone.0269061", role: "slow-running continuous gradient interpolation at 2.25 m/s" }),
    Object.freeze({ sourceId: "SRC-A6-002", doi: "10.3389/fspor.2023.1217783", role: "independent slow-running slope-related ankle/knee/hip redistribution at 1.8 m/s" }),
    Object.freeze({ sourceId: "SRC-A6-003", doi: "10.1038/s41598-018-24332-z", role: "uphill lower-limb neuromuscular adaptation including 2.5 m/s running" }),
    Object.freeze({ sourceId: "SRC-A6-004", doi: "10.3389/fbioe.2020.581619", role: "overground/treadmill running motor-module comparability at 2.8 m/s; environment transfer remains partial" }),
    Object.freeze({ sourceId: "SRC-A6-005", doi: "10.1186/1471-2474-13-235", role: "overground/treadmill vertical-GRF agreement across slow, preferred, and fast self-selected running; supports only bounded environment transfer, not joint-work magnitude equivalence" }),
  ]),
  limitations: Object.freeze([
    "R19: cross-speed and outdoor/track numeric magnitude transfer is retired",
    "the historical 1.8-2.5 m/s envelope is retained only for audit provenance",
    "supporting sources do not calibrate Nuckols joint-power magnitudes outside the fixed 2.25 m/s treadmill protocol",
    "no extrapolation beyond the Nuckols grade knots",
    "no diagnosis, injury-risk, safety, or personal prescription interpretation",
  ]),
});

// A6 regional proxy additions derived from the same Nuckols running table.
// R19 uses them only at the exact 2.25 m/s treadmill source protocol and marks
// the region mapping PARTIAL. They are not used for cross-speed/environment
// transfer and do not alter the exact A3 joint-grade routes above.
export const A6_NUCKOLS_REGIONAL_GRADE_PROXY_SOURCE = Object.freeze({
  sourceId: "SRC-SUP-003",
  gradePercent: Object.freeze([-10, -5, 0, 5, 10]),
  gradeDegrees: Object.freeze([-5.71, -2.86, 0, 2.86, 5.71]),
  regions: Object.freeze({
    "BA-DISP-015": Object.freeze({
      endpoint: "project-derived hip total absolute joint mechanical power (source positive average power plus magnitude of source negative average power); gluteal functional-demand proxy",
      aggregationRule: "SOURCE_POSITIVE_AVERAGE_POWER_PLUS_ABSOLUTE_SOURCE_NEGATIVE_AVERAGE_POWER; within-source derived proxy, not a source-reported gluteal endpoint",
      rawValuesWPerKg: Object.freeze([1.12, 1.20, 1.17, 1.55, 1.84]),
      ratios: Object.freeze([0.9572649572649573, 1.0256410256410255, 1, 1.3247863247863247, 1.5726495726495726]),
      observedComponentIds: Object.freeze(["HIP_TOTAL_ABSOLUTE_JOINT_POWER_PROXY"]),
      missingComponentIds: Object.freeze(["DIRECT_GLUTEUS_MAXIMUS_FORCE", "DIRECT_GLUTEUS_MEDIUS_FORCE", "DIRECT_TISSUE_LOAD"]),
    }),
    "BA-DISP-023": Object.freeze({
      endpoint: "project-derived ankle total absolute joint mechanical power (source positive average power plus magnitude of source negative average power); posterior-lower-leg/plantar-flexor functional-demand proxy",
      aggregationRule: "SOURCE_POSITIVE_AVERAGE_POWER_PLUS_ABSOLUTE_SOURCE_NEGATIVE_AVERAGE_POWER; within-source derived proxy, not a source-reported soleus/gastrocnemius endpoint",
      rawValuesWPerKg: Object.freeze([2.40, 2.52, 3.14, 3.19, 3.18]),
      ratios: Object.freeze([0.764331210191083, 0.802547770700637, 1, 1.015923566878981, 1.012738853503185]),
      observedComponentIds: Object.freeze(["ANKLE_TOTAL_ABSOLUTE_JOINT_POWER_PROXY"]),
      missingComponentIds: Object.freeze(["DIRECT_SOLEUS_FORCE", "DIRECT_GASTROCNEMIUS_FORCE", "DIRECT_TISSUE_LOAD"]),
    }),
  }),
});

// Heiderscheit et al. 2011, Table 2 historical evidence registry. Raw values
// are retained for audit, but R17 disables numeric runtime use because the
// intervention was relative to each runner's own preferred step rate and the
// app does not contain a source-compatible preferred-cadence baseline.
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
  runSetting: "TREADMILL",
  speedMatchEpsilonMps: 1e-9,
  historicalSpeedToleranceFraction: 0.05, // pre-R23 project tolerance; retained for audit only
  gradePercent: [0, 2, 7],
  ratios: [1, 0.6478, 0.6286],
  endpoint: "vastus medialis EMG amplitude normalized to level",
  sourceAnchorRange: "RCM-ANCH-A3-031..033",
});

// E02 / Hamner et al. 2013 Figure 5. Values were digitized from the preserved
// vector/raster figure and checked against the article's reported across-speed
// differences. They are functional-contribution proxies, not direct muscle
// force or tissue load. R24 treats the reported group-mean stride-time-derived
// cadence only as descriptive provenance; it is not an individual eligibility
// threshold. Restrict numeric use to the source speed domain, level treadmill
// running, with within-source speed interpolation only.
export const FIGURE_DIGITIZED_SPEED_SOURCE = Object.freeze({
  sourceId: "E02",
  runSetting: "TREADMILL",
  speedMps: [2, 3, 4, 5],
  sourceCadenceSpm: [159.574468085106, 167.832167832168, 178.571428571429, 193.861066235864],
  historicalCadenceToleranceFraction: 0.05, // pre-R24 project gate; retained for audit only
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
    // Retained only as a fallback below the Willer 2024 lower speed bound.
    // Whenever the tabulated Willer paired speed-natural-cadence protocol is
    // applicable, the Willer route has precedence and this digitized proxy is
    // not used.
    "BA-DISP-023": Object.freeze({
      endpoint: "soleus plus gastrocnemius peak upward COM-acceleration contribution",
      rawValuesMps2: [15.748, 18.976, 20.748, 22.441],
      ratiosAtModelReference: [0.862155805591, 1.038879131756, 1.135890821336, 1.228577497668],
      coverageState: "PARTIAL",
      sourceAnchorRange: "RCM-ANCH-A3-040..043",
    }),
  }),
});

// Willer et al. 2024, Table 2 (open-access article). Unlike the retained E02
// gluteal speed route, these values are transcribed from a numeric table rather
// than digitized from a figure. The source used level instrumented-treadmill
// running at six fixed speeds; only the 2.78, 3.89, and 5.00 m/s knots are
// admitted because the current Regional A5 speed domain ends at 5.00 m/s.
// Table 1 group-mean step frequency is retained as descriptive provenance only.
// Every mapping remains PARTIAL: joint/functional-group work is a regional
// mechanical-demand proxy and not direct muscle force or tissue load.
export const WILLER_2024_TABULATED_SPEED_WORK_SOURCE = Object.freeze({
  sourceId: "SRC-A5-001",
  doi: "10.1111/sms.14690",
  runSetting: "TREADMILL",
  speedMps: Object.freeze([2.78, 3.89, 5.00]),
  sourceCadenceSpm: Object.freeze([164, 170, 180]),
  historicalCadenceToleranceFraction: 0.05, // pre-R24 project gate; retained for audit only
  referenceSpeedMps: 2.78,
  sourceLocator: "Willer et al. 2024, Tables 1-2; Scand J Med Sci Sports 34:e14690",
  regions: Object.freeze({
    "BA-DISP-014": Object.freeze({
      endpoint: "hip total absolute mechanical work from all reported hip flexion/extension work terms across stance and swing",
      rawWorkJPerKg: Object.freeze([0.81, 1.40, 2.15]),
      ratiosToReference: Object.freeze([1.0, 1.7283950617283947, 2.654320987654321]),
      coverageState: "PARTIAL",
      observedComponentIds: Object.freeze(["HIP_REPORTED_ABSOLUTE_WORK"]),
      missingComponentIds: Object.freeze(["DIRECT_TISSUE_LOAD"]),
    }),
    "BA-DISP-016": Object.freeze({
      endpoint: "sum of reported absolute knee-extension work components (stance positive + stance negative + swing negative); anterior-thigh functional-group proxy",
      rawWorkJPerKg: Object.freeze([0.68, 0.95, 1.19]),
      ratiosToReference: Object.freeze([1.0, 1.3970588235294117, 1.75]),
      coverageState: "PARTIAL",
      observedComponentIds: Object.freeze(["KNEE_EXTENSOR_REPORTED_WORK"]),
      missingComponentIds: Object.freeze(["DIRECT_QUADRICEPS_FORCE","DIRECT_TISSUE_LOAD"]),
    }),
    "BA-DISP-018": Object.freeze({
      endpoint: "swing-phase negative knee-flexion work; posterior-thigh/hamstring-dominant functional proxy",
      rawWorkJPerKg: Object.freeze([0.36, 0.55, 0.79]),
      ratiosToReference: Object.freeze([1.0, 1.527777777777778, 2.1944444444444446]),
      coverageState: "PARTIAL",
      observedComponentIds: Object.freeze(["SWING_NEGATIVE_KNEE_FLEXOR_WORK"]),
      missingComponentIds: Object.freeze(["DIRECT_HAMSTRING_FORCE","OTHER_POSTERIOR_THIGH_COMPONENTS"]),
    }),
    "BA-DISP-023": Object.freeze({
      endpoint: "stance plantar-flexor total absolute work (positive + magnitude of negative work); posterior-lower-leg functional-group proxy",
      rawWorkJPerKg: Object.freeze([1.49, 2.02, 2.52]),
      ratiosToReference: Object.freeze([1.0, 1.3557046979865772, 1.691275167785235]),
      coverageState: "PARTIAL",
      observedComponentIds: Object.freeze(["ANKLE_PLANTAR_FLEXOR_STANCE_WORK"]),
      missingComponentIds: Object.freeze(["DIRECT_SOLEUS_FORCE","DIRECT_GASTROCNEMIUS_FORCE","DIRECT_TISSUE_LOAD"]),
    }),
  }),
  limitations: Object.freeze([
    "11 male middle-distance runners; group means are not beginner-specific personal calibration",
    "level instrumented-treadmill protocol only",
    "Table 1 group-mean step frequency is descriptive provenance and is not an individual eligibility threshold",
    "joint/functional-group work is a regional proxy, not measured tissue load or injury risk",
    "no extrapolation outside 2.78-5.00 m/s",
  ]),
});


// Current A5 source-bounded route: Chumanov et al. 2012.
// The source manipulated step rate at each runner's preferred speed and reports
// phase-specific normalized EMG. The source values are retained for audit.
// R17 disables numeric runtime use because preferred/+5%/+10% step rate is a
// participant-relative intervention and the app does not contain the matching
// individual preferred-cadence baseline. No absolute-cadence prescription is inferred.
export const CHUMANOV_CADENCE_EMG_SOURCE = Object.freeze({
  sourceId: "SRC-A5-002",
  doi: "10.1016/j.gaitpost.2012.02.023",
  runSetting: "TREADMILL",
  preferredSpeedMps: 2.9,
  historicalSpeedToleranceFraction: 0.05, // cadence route retired R17; not used by numeric routing
  cadenceSpm: Object.freeze([172.6, 181.23, 189.86]),
  relativeStepRate: Object.freeze([1.0, 1.05, 1.10]),
  region: "BA-DISP-018",
  endpoint: "posterior-thigh mid-late-swing (70–80% gait cycle) normalized EMG; equal-weight medial/lateral hamstring regional proxy",
  components: Object.freeze({
    LATERAL_HAMSTRING: Object.freeze({
      rawNormalizedEmg: Object.freeze([1.1, 1.0, 1.3]),
      ratiosToPreferred: Object.freeze([1.0, 0.9090909090909091, 1.1818181818181817]),
    }),
    MEDIAL_HAMSTRINGS: Object.freeze({
      rawNormalizedEmg: Object.freeze([1.0, 1.1, 1.3]),
      ratiosToPreferred: Object.freeze([1.0, 1.1, 1.3]),
    }),
  }),
  regionalRatios: Object.freeze([1.0, 1.0, 1.23950136601927]),
  aggregationRule: "equal-weight geometric mean of medial and lateral hamstring ratios within the same 70–80% gait-cycle endpoint",
  coverageState: "PARTIAL",
  sourceLocator: "Chumanov et al. 2012, Table 1; Gait & Posture 36(2):231–235",
  limitations: Object.freeze([
    "group-mean treadmill protocol",
    "only preferred, +5%, and +10% step-rate conditions are supported",
    "no cadence-decrease extrapolation",
    "phase-specific EMG is a regional muscle-activation proxy, not muscle force or tissue load",
    "absolute cadence anchors are group-mean coordinates and are not a personal preferred cadence",
  ]),
});
