// Generated from locked Authority artifacts. Do not edit by hand.
export const AUTHORITY_VERSION = "RunLoad Regional Calculation Model Authority V1.1 Amendment A6 Candidate";
export const PARAMETER_SET_VERSION = "RCM-V1.1-A6-CANDIDATE";
export const ADAPTER_VERSION = "RunLoad Input Preset Mapping V1.0";
export const REGIONS = Object.freeze([
  {
    "id": "BA-DISP-014",
    "name": "股関節まわり",
    "constructId": "HIP_JOINT_MECHANICAL_DEMAND_TENDENCY",
    "formulaClass": "CONDITION_ROUTED_WORK",
    "referenceDefinitionId": "RCM-RDEF-014"
  },
  {
    "id": "BA-DISP-015",
    "name": "お尻",
    "constructId": "GLUTEAL_FUNCTIONAL_DEMAND_TENDENCY",
    "formulaClass": "PRIMARY_DOMINANT_COMPOSITE",
    "referenceDefinitionId": "RCM-RDEF-015"
  },
  {
    "id": "BA-DISP-016",
    "name": "太ももの前",
    "constructId": "ANTERIOR_THIGH_MUSCLE_DEMAND_TENDENCY",
    "formulaClass": "ROUTE_SELECTED_PROXY",
    "referenceDefinitionId": "RCM-RDEF-016"
  },
  {
    "id": "BA-DISP-018",
    "name": "太ももの後ろ",
    "constructId": "POSTERIOR_THIGH_MUSCLE_DEMAND_TENDENCY",
    "formulaClass": "ROUTE_SELECTED_PROXY",
    "referenceDefinitionId": "RCM-RDEF-018"
  },
  {
    "id": "BA-DISP-019",
    "name": "膝の前",
    "constructId": "PATELLOFEMORAL_CUMULATIVE_STRESS_IMPULSE_TENDENCY",
    "formulaClass": "DIRECT_SOURCE_CURVE",
    "referenceDefinitionId": "RCM-RDEF-019"
  },
  {
    "id": "BA-DISP-021",
    "name": "すね",
    "constructId": "TIBIAL_CUMULATIVE_TOTAL_STRESS_IMPULSE_TENDENCY",
    "formulaClass": "DIRECT_SOURCE_CURVE",
    "referenceDefinitionId": "RCM-RDEF-021"
  },
  {
    "id": "BA-DISP-023",
    "name": "ふくらはぎ",
    "constructId": "POSTERIOR_LOWER_LEG_MUSCLE_DEMAND_TENDENCY",
    "formulaClass": "PRIMARY_DOMINANT_COMPOSITE",
    "referenceDefinitionId": "RCM-RDEF-023"
  },
  {
    "id": "BA-DISP-024",
    "name": "足首まわり",
    "constructId": "ANKLE_TOTAL_MECHANICAL_WORK_TENDENCY",
    "formulaClass": "CONDITION_ROUTED_WORK",
    "referenceDefinitionId": "RCM-RDEF-024"
  },
  {
    "id": "BA-DISP-025",
    "name": "足首の後ろ・アキレス腱周辺",
    "constructId": "ACHILLES_CUMULATIVE_STRAIN_IMPULSE_TENDENCY",
    "formulaClass": "DIRECT_SOURCE_CURVE",
    "referenceDefinitionId": "RCM-RDEF-025"
  },
  {
    "id": "BA-DISP-027",
    "name": "かかと・足裏の後ろ",
    "constructId": "REARFOOT_CUMULATIVE_PRESSURE_TIME_EXPOSURE_TENDENCY",
    "formulaClass": "MASK_WEIGHTED_SOURCE_CURVE",
    "referenceDefinitionId": "RCM-RDEF-027"
  },
  {
    "id": "BA-DISP-028",
    "name": "土踏まず・足裏の中央",
    "constructId": "MEDIAL_LONGITUDINAL_ARCH_MECHANICAL_CONTROL_TENDENCY",
    "formulaClass": "PRIMARY_DOMINANT_COMPOSITE",
    "referenceDefinitionId": "RCM-RDEF-028"
  },
  {
    "id": "BA-DISP-029",
    "name": "足裏の前・母趾球周辺",
    "constructId": "FOREFOOT_CUMULATIVE_PRESSURE_TIME_EXPOSURE_TENDENCY",
    "formulaClass": "MASK_WEIGHTED_SOURCE_CURVE",
    "referenceDefinitionId": "RCM-RDEF-029"
  }
]);
export const FORMAL_INPUT_CATALOG = Object.freeze([
  {
    "id": "RL-IN-001",
    "technicalName": "dayStatus",
    "label": "日状態",
    "groupId": "G01",
    "disposition": "ROUTING_APPLICABILITY",
    "numericPermission": "ROUTING_ONLY",
    "missingnessBehavior": "UNKNOWN/invalid route => PARTIAL or UNAVAILABLE according to dependent route; never assume reference silently.",
    "doubleCountingGuard": "Routing value is not added to index."
  },
  {
    "id": "RL-IN-002",
    "technicalName": "sessionDate",
    "label": "実施日",
    "groupId": "G01",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-003",
    "technicalName": "activityType",
    "label": "記録種別",
    "groupId": "G01",
    "disposition": "ROUTING_APPLICABILITY",
    "numericPermission": "ROUTING_ONLY",
    "missingnessBehavior": "UNKNOWN/invalid route => PARTIAL or UNAVAILABLE according to dependent route; never assume reference silently.",
    "doubleCountingGuard": "Routing value is not added to index."
  },
  {
    "id": "RL-IN-004",
    "technicalName": "sessionId",
    "label": "走行記録ID",
    "groupId": "G01",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-005",
    "technicalName": "sessionSequence",
    "label": "同日内順序",
    "groupId": "G01",
    "disposition": "ROUTING_APPLICABILITY",
    "numericPermission": "ROUTING_ONLY",
    "missingnessBehavior": "UNKNOWN/invalid route => PARTIAL or UNAVAILABLE according to dependent route; never assume reference silently.",
    "doubleCountingGuard": "Routing value is not added to index."
  },
  {
    "id": "RL-IN-006",
    "technicalName": "recordNote",
    "label": "記録メモ",
    "groupId": "G01",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-007",
    "technicalName": "recordRevision",
    "label": "記録改訂番号",
    "groupId": "G01",
    "disposition": "MISSINGNESS_PROVENANCE_CONFIDENCE",
    "numericPermission": "NON_NUMERIC_GATE",
    "missingnessBehavior": "Apply declared gate; UNKNOWN is not 0 and may downgrade CALCULATED to PARTIAL/UNAVAILABLE.",
    "doubleCountingGuard": "Metadata never contributes numerically."
  },
  {
    "id": "RL-IN-010",
    "technicalName": "distanceStatus",
    "label": "距離の入力状態",
    "groupId": "G02",
    "disposition": "MISSINGNESS_PROVENANCE_CONFIDENCE",
    "numericPermission": "NON_NUMERIC_GATE",
    "missingnessBehavior": "Apply declared gate; UNKNOWN is not 0 and may downgrade CALCULATED to PARTIAL/UNAVAILABLE.",
    "doubleCountingGuard": "Metadata never contributes numerically."
  },
  {
    "id": "RL-IN-011",
    "technicalName": "distanceKm",
    "label": "距離",
    "groupId": "G02",
    "disposition": "CUMULATIVE_EXPOSURE",
    "numericPermission": "EXPOSURE_ONLY",
    "missingnessBehavior": "Use only an approved fallback hierarchy; if no compatible exposure can be derived, region is UNAVAILABLE.",
    "doubleCountingGuard": "Select exactly one compatible exposure basis per region/section; distance, duration and steps cannot all contribute independently."
  },
  {
    "id": "RL-IN-012",
    "technicalName": "durationStatus",
    "label": "実走時間の入力状態",
    "groupId": "G02",
    "disposition": "MISSINGNESS_PROVENANCE_CONFIDENCE",
    "numericPermission": "NON_NUMERIC_GATE",
    "missingnessBehavior": "Apply declared gate; UNKNOWN is not 0 and may downgrade CALCULATED to PARTIAL/UNAVAILABLE.",
    "doubleCountingGuard": "Metadata never contributes numerically."
  },
  {
    "id": "RL-IN-013",
    "technicalName": "durationMinutes",
    "label": "実走時間",
    "groupId": "G02",
    "disposition": "CUMULATIVE_EXPOSURE",
    "numericPermission": "EXPOSURE_ONLY",
    "missingnessBehavior": "Use only an approved fallback hierarchy; if no compatible exposure can be derived, region is UNAVAILABLE.",
    "doubleCountingGuard": "Select exactly one compatible exposure basis per region/section; distance, duration and steps cannot all contribute independently."
  },
  {
    "id": "RL-IN-014",
    "technicalName": "stepsStatus",
    "label": "歩数の入力状態",
    "groupId": "G02",
    "disposition": "MISSINGNESS_PROVENANCE_CONFIDENCE",
    "numericPermission": "NON_NUMERIC_GATE",
    "missingnessBehavior": "Apply declared gate; UNKNOWN is not 0 and may downgrade CALCULATED to PARTIAL/UNAVAILABLE.",
    "doubleCountingGuard": "Metadata never contributes numerically."
  },
  {
    "id": "RL-IN-015",
    "technicalName": "steps",
    "label": "歩数",
    "groupId": "G02",
    "disposition": "CUMULATIVE_EXPOSURE",
    "numericPermission": "EXPOSURE_ONLY",
    "missingnessBehavior": "Use only an approved fallback hierarchy; if no compatible exposure can be derived, region is UNAVAILABLE.",
    "doubleCountingGuard": "Select exactly one compatible exposure basis per region/section; distance, duration and steps cannot all contribute independently."
  },
  {
    "id": "RL-IN-016",
    "technicalName": "stepsProvenance",
    "label": "歩数の出所",
    "groupId": "G02",
    "disposition": "MISSINGNESS_PROVENANCE_CONFIDENCE",
    "numericPermission": "NON_NUMERIC_GATE",
    "missingnessBehavior": "Apply declared gate; UNKNOWN is not 0 and may downgrade CALCULATED to PARTIAL/UNAVAILABLE.",
    "doubleCountingGuard": "Metadata never contributes numerically."
  },
  {
    "id": "RL-IN-017",
    "technicalName": "runningFormat",
    "label": "走行形式",
    "groupId": "G02",
    "disposition": "INTERACTION_ONLY",
    "numericPermission": "INTERACTION_ONLY",
    "missingnessBehavior": "If any required factor is missing, interaction is inactive and coverage records the missing prerequisite.",
    "doubleCountingGuard": "No main effect; interaction ID must be unique and stacking register must prove non-overlap."
  },
  {
    "id": "RL-IN-018",
    "technicalName": "runSetting",
    "label": "走行環境",
    "groupId": "G02",
    "disposition": "ROUTING_APPLICABILITY",
    "numericPermission": "ROUTING_ONLY",
    "missingnessBehavior": "Missing or mixed setting disables environment-specific source protocols; no treadmill or track condition is inferred.",
    "doubleCountingGuard": "The setting selects source eligibility only and is never added as an independent numeric effect."
  },
  {
    "id": "RL-DV-019",
    "technicalName": "averageSpeedMps",
    "label": "平均速度",
    "groupId": "G02",
    "disposition": "CONDITIONAL_NUMERIC_EFFECT",
    "numericPermission": "DIRECT_OR_CONDITIONAL",
    "missingnessBehavior": "Missing => omit only that evidence-gated effect and mark PARTIAL when material; never impute reference without disclosure.",
    "doubleCountingGuard": "Derived aliases and source-correlated factors require a declared canonical factor; no duplicate main effect and interaction use without decomposition."
  },
  {
    "id": "RL-DV-020",
    "technicalName": "averagePaceMinPerKm",
    "label": "平均ペース",
    "groupId": "G02",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-DV-021",
    "technicalName": "averageCadenceSpm",
    "label": "平均ケイデンス",
    "groupId": "G02",
    "disposition": "CONDITIONAL_NUMERIC_EFFECT",
    "numericPermission": "DIRECT_OR_CONDITIONAL",
    "missingnessBehavior": "Missing => omit only that evidence-gated effect and mark PARTIAL when material; never impute reference without disclosure.",
    "doubleCountingGuard": "Derived aliases and source-correlated factors require a declared canonical factor; no duplicate main effect and interaction use without decomposition."
  },
  {
    "id": "RL-IN-030",
    "technicalName": "courseId",
    "label": "保存コースID",
    "groupId": "G03",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-031",
    "technicalName": "courseName",
    "label": "コース名",
    "groupId": "G03",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-032",
    "technicalName": "gradeKnowledge",
    "label": "勾配情報の把握状態",
    "groupId": "G03",
    "disposition": "MISSINGNESS_PROVENANCE_CONFIDENCE",
    "numericPermission": "NON_NUMERIC_GATE",
    "missingnessBehavior": "Apply declared gate; UNKNOWN is not 0 and may downgrade CALCULATED to PARTIAL/UNAVAILABLE.",
    "doubleCountingGuard": "Metadata never contributes numerically."
  },
  {
    "id": "RL-IN-033",
    "technicalName": "uphillSharePercent",
    "label": "上り区間割合",
    "groupId": "G03",
    "disposition": "SECTION_ROUTING_AND_AGGREGATION",
    "numericPermission": "ROUTING_ONLY",
    "missingnessBehavior": "Use highest available granularity; unknown shares/sections trigger fallback or PARTIAL, not zero-length assumptions.",
    "doubleCountingGuard": "Detailed sections override summary shares; section weights must sum to one within the represented course portion."
  },
  {
    "id": "RL-IN-034",
    "technicalName": "downhillSharePercent",
    "label": "下り区間割合",
    "groupId": "G03",
    "disposition": "SECTION_ROUTING_AND_AGGREGATION",
    "numericPermission": "ROUTING_ONLY",
    "missingnessBehavior": "Use highest available granularity; unknown shares/sections trigger fallback or PARTIAL, not zero-length assumptions.",
    "doubleCountingGuard": "Detailed sections override summary shares; section weights must sum to one within the represented course portion."
  },
  {
    "id": "RL-DV-035",
    "technicalName": "flatSharePercent",
    "label": "平坦区間割合",
    "groupId": "G03",
    "disposition": "SECTION_ROUTING_AND_AGGREGATION",
    "numericPermission": "ROUTING_ONLY",
    "missingnessBehavior": "Use highest available granularity; unknown shares/sections trigger fallback or PARTIAL, not zero-length assumptions.",
    "doubleCountingGuard": "Detailed sections override summary shares; section weights must sum to one within the represented course portion."
  },
  {
    "id": "RL-IN-036",
    "technicalName": "uphillGradePercent",
    "label": "代表上り勾配",
    "groupId": "G03",
    "disposition": "CONDITIONAL_NUMERIC_EFFECT",
    "numericPermission": "DIRECT_OR_CONDITIONAL",
    "missingnessBehavior": "Missing => omit only that evidence-gated effect and mark PARTIAL when material; never impute reference without disclosure.",
    "doubleCountingGuard": "Derived aliases and source-correlated factors require a declared canonical factor; no duplicate main effect and interaction use without decomposition."
  },
  {
    "id": "RL-IN-037",
    "technicalName": "downhillGradePercent",
    "label": "代表下り勾配の大きさ",
    "groupId": "G03",
    "disposition": "CONDITIONAL_NUMERIC_EFFECT",
    "numericPermission": "DIRECT_OR_CONDITIONAL",
    "missingnessBehavior": "Missing => omit only that evidence-gated effect and mark PARTIAL when material; never impute reference without disclosure.",
    "doubleCountingGuard": "Derived aliases and source-correlated factors require a declared canonical factor; no duplicate main effect and interaction use without decomposition."
  },
  {
    "id": "RL-IN-038",
    "technicalName": "routePattern",
    "label": "コース形式",
    "groupId": "G03",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation; it remains available for course-history explanation and comparison.",
    "doubleCountingGuard": "No coefficient or route selection in Regional A4."
  },
  {
    "id": "RL-IN-039",
    "technicalName": "courseSections[]",
    "label": "区間情報",
    "groupId": "G03",
    "disposition": "SECTION_ROUTING_AND_AGGREGATION",
    "numericPermission": "ROUTING_ONLY",
    "missingnessBehavior": "Use highest available granularity; unknown shares/sections trigger fallback or PARTIAL, not zero-length assumptions.",
    "doubleCountingGuard": "Detailed sections override summary shares; section weights must sum to one within the represented course portion."
  },
  {
    "id": "RL-IN-040",
    "technicalName": "surfaceKnowledge",
    "label": "路面把握状態",
    "groupId": "G04",
    "disposition": "MISSINGNESS_PROVENANCE_CONFIDENCE",
    "numericPermission": "NON_NUMERIC_GATE",
    "missingnessBehavior": "Apply declared gate; UNKNOWN is not 0 and may downgrade CALCULATED to PARTIAL/UNAVAILABLE.",
    "doubleCountingGuard": "Metadata never contributes numerically."
  },
  {
    "id": "RL-IN-041",
    "technicalName": "surfaceComponents[]",
    "label": "路面構成",
    "groupId": "G04",
    "disposition": "SECTION_ROUTING_AND_AGGREGATION",
    "numericPermission": "ROUTING_ONLY",
    "missingnessBehavior": "Use highest available granularity; unknown shares/sections trigger fallback or PARTIAL, not zero-length assumptions.",
    "doubleCountingGuard": "Detailed sections override summary shares; section weights must sum to one within the represented course portion."
  },
  {
    "id": "RL-IN-042",
    "technicalName": "surfaceMaterialLabel",
    "label": "路面の見た目・材質ラベル",
    "groupId": "G04",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing follows the canonical RL-IN-041 surface component record.",
    "doubleCountingGuard": "Canonical numeric/routing data are carried only inside RL-IN-041 surfaceComponents; this field is a preset-derived audit alias and cannot add a second effect."
  },
  {
    "id": "RL-IN-043",
    "technicalName": "surfaceSharePercent",
    "label": "路面割合",
    "groupId": "G04",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing follows the canonical RL-IN-041 surface component record.",
    "doubleCountingGuard": "Canonical numeric/routing data are carried only inside RL-IN-041 surfaceComponents; this field is a preset-derived audit alias and cannot add a second effect."
  },
  {
    "id": "RL-IN-044",
    "technicalName": "surfaceHardnessLevel",
    "label": "硬さ",
    "groupId": "G04",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing follows the canonical RL-IN-041 surface component record.",
    "doubleCountingGuard": "Canonical numeric/routing data are carried only inside RL-IN-041 surfaceComponents; this field is a preset-derived audit alias and cannot add a second effect."
  },
  {
    "id": "RL-IN-045",
    "technicalName": "surfaceUnevennessLevel",
    "label": "凹凸・不整地性",
    "groupId": "G04",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing follows the canonical RL-IN-041 surface component record.",
    "doubleCountingGuard": "Canonical numeric/routing data are carried only inside RL-IN-041 surfaceComponents; this field is a preset-derived audit alias and cannot add a second effect."
  },
  {
    "id": "RL-IN-046",
    "technicalName": "surfaceGripLevel",
    "label": "グリップ・滑りにくさ",
    "groupId": "G04",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing follows the canonical RL-IN-041 surface component record.",
    "doubleCountingGuard": "Canonical numeric/routing data are carried only inside RL-IN-041 surfaceComponents; this field is a preset-derived audit alias and cannot add a second effect."
  },
  {
    "id": "RL-IN-047",
    "technicalName": "surfaceSinkLevel",
    "label": "沈み込み・柔らかさ",
    "groupId": "G04",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing follows the canonical RL-IN-041 surface component record.",
    "doubleCountingGuard": "Canonical numeric/routing data are carried only inside RL-IN-041 surfaceComponents; this field is a preset-derived audit alias and cannot add a second effect."
  },
  {
    "id": "RL-IN-048",
    "technicalName": "surfaceReboundLevel",
    "label": "反発性",
    "groupId": "G04",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing follows the canonical RL-IN-041 surface component record.",
    "doubleCountingGuard": "Canonical numeric/routing data are carried only inside RL-IN-041 surfaceComponents; this field is a preset-derived audit alias and cannot add a second effect."
  },
  {
    "id": "RL-IN-049",
    "technicalName": "surfaceStabilityLevel",
    "label": "安定性",
    "groupId": "G04",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing follows the canonical RL-IN-041 surface component record.",
    "doubleCountingGuard": "Canonical numeric/routing data are carried only inside RL-IN-041 surfaceComponents; this field is a preset-derived audit alias and cannot add a second effect."
  },
  {
    "id": "RL-IN-050",
    "technicalName": "surfaceWetSlipState",
    "label": "濡れ・滑り状態",
    "groupId": "G04",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation; known wet/slip context remains available for safety-oriented explanation and comparison.",
    "doubleCountingGuard": "No coefficient or interaction is applied in Regional A4."
  },
  {
    "id": "RL-IN-060",
    "technicalName": "weatherState",
    "label": "天候",
    "groupId": "G05",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-061",
    "technicalName": "temperatureC",
    "label": "気温",
    "groupId": "G05",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-062",
    "technicalName": "windLevel",
    "label": "風の感じ",
    "groupId": "G05",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-063",
    "technicalName": "environmentNote",
    "label": "環境メモ",
    "groupId": "G05",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-070",
    "technicalName": "shoeId",
    "label": "保存シューズID",
    "groupId": "G06",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-071",
    "technicalName": "shoeLabel",
    "label": "シューズ名",
    "groupId": "G06",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-072",
    "technicalName": "shoeType",
    "label": "シューズ種類",
    "groupId": "G06",
    "disposition": "PROTOCOL_CONTEXT_NO_NUMERIC_EFFECT",
    "numericPermission": "CONTEXT_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation; when present the value is retained as explicit context/protocol provenance and is not assigned an isolated numeric coefficient.",
    "doubleCountingGuard": "Derived aliases and source-correlated factors require a declared canonical factor; no duplicate main effect and interaction use without decomposition."
  },
  {
    "id": "RL-IN-073",
    "technicalName": "shoeSoftness",
    "label": "やわらかさの自己認識",
    "groupId": "G06",
    "disposition": "PROTOCOL_CONTEXT_NO_NUMERIC_EFFECT",
    "numericPermission": "CONTEXT_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation; when present the value is retained as explicit context/protocol provenance and is not assigned an isolated numeric coefficient.",
    "doubleCountingGuard": "Derived aliases and source-correlated factors require a declared canonical factor; no duplicate main effect and interaction use without decomposition."
  },
  {
    "id": "RL-IN-074",
    "technicalName": "equipmentTags[]",
    "label": "装備・携行品",
    "groupId": "G06",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-075",
    "technicalName": "equipmentNote",
    "label": "シューズ・装備メモ",
    "groupId": "G06",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-080",
    "technicalName": "footPlacementSelfReport",
    "label": "足のつき方の自己認識",
    "groupId": "G07",
    "disposition": "CONDITIONAL_PLANTAR_CONTEXT_NO_ISOLATED_NUMERIC_EFFECT",
    "numericPermission": "CONTEXT_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation; when present the value is retained as explicit context/protocol provenance and is not assigned an isolated numeric coefficient.",
    "doubleCountingGuard": "Derived aliases and source-correlated factors require a declared canonical factor; no duplicate main effect and interaction use without decomposition."
  },
  {
    "id": "RL-IN-081",
    "technicalName": "rhythmStrideSelfReport",
    "label": "歩幅・テンポの自己認識",
    "groupId": "G07",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation; the self-report remains available for reflection and comparison.",
    "doubleCountingGuard": "Self-reported rhythm/stride does not substitute for measured or derived cadence and has no canonical numeric effect."
  },
  {
    "id": "RL-IN-082",
    "technicalName": "runningFocusTags[]",
    "label": "実施時に意識したこと",
    "groupId": "G07",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-083",
    "technicalName": "runningStyleNote",
    "label": "走り方メモ",
    "groupId": "G07",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-090",
    "technicalName": "rpeStatus",
    "label": "RPE入力状態",
    "groupId": "G08",
    "disposition": "MISSINGNESS_PROVENANCE_CONFIDENCE",
    "numericPermission": "NON_NUMERIC_GATE",
    "missingnessBehavior": "Apply declared gate; UNKNOWN is not 0 and may downgrade CALCULATED to PARTIAL/UNAVAILABLE.",
    "doubleCountingGuard": "Metadata never contributes numerically."
  },
  {
    "id": "RL-IN-091",
    "technicalName": "rpeValue",
    "label": "RPE",
    "groupId": "G08",
    "disposition": "SESSION_SUBJECTIVE_PARALLEL_COMPONENT",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing affects parallel context only, not mechanical index availability.",
    "doubleCountingGuard": "Not summed into mechanical C/E/I/P components."
  },
  {
    "id": "RL-IN-092",
    "technicalName": "rpeProvenance",
    "label": "RPEの出所",
    "groupId": "G08",
    "disposition": "MISSINGNESS_PROVENANCE_CONFIDENCE",
    "numericPermission": "NON_NUMERIC_GATE",
    "missingnessBehavior": "Apply declared gate; UNKNOWN is not 0 and may downgrade CALCULATED to PARTIAL/UNAVAILABLE.",
    "doubleCountingGuard": "Metadata never contributes numerically."
  },
  {
    "id": "RL-IN-093",
    "technicalName": "postRunReflection",
    "label": "今回の感想",
    "groupId": "G08",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-094",
    "technicalName": "perceivedDifference",
    "label": "普段との違い",
    "groupId": "G08",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-100",
    "technicalName": "bodyReviewStatus",
    "label": "身体確認状態",
    "groupId": "G09",
    "disposition": "MISSINGNESS_PROVENANCE_CONFIDENCE",
    "numericPermission": "NON_NUMERIC_GATE",
    "missingnessBehavior": "Apply declared gate; UNKNOWN is not 0 and may downgrade CALCULATED to PARTIAL/UNAVAILABLE.",
    "doubleCountingGuard": "Metadata never contributes numerically."
  },
  {
    "id": "RL-IN-101",
    "technicalName": "bodyAreaObservations[]",
    "label": "部位観察",
    "groupId": "G09",
    "disposition": "SELF_REPORTED_REGION_STATE_COMPONENT",
    "numericPermission": "SELF_REPORTED_SEPARATE",
    "missingnessBehavior": "NOT_REVIEWED differs from REVIEWED_NO_AREA; absent report is not intensity 0 unless explicitly reviewed with no area.",
    "doubleCountingGuard": "Observation container and fields form one matched-region record; no observation field may enter the canonical numeric index."
  },
  {
    "id": "RL-IN-102",
    "technicalName": "bodyAreaId",
    "label": "部位ID",
    "groupId": "G09",
    "disposition": "SELF_REPORTED_REGION_STATE_COMPONENT",
    "numericPermission": "SELF_REPORTED_SEPARATE",
    "missingnessBehavior": "NOT_REVIEWED differs from REVIEWED_NO_AREA; absent report is not intensity 0 unless explicitly reviewed with no area.",
    "doubleCountingGuard": "RL-IN-101 observation array is canonical; this single-observation compatibility alias never creates an independent numeric or overlay contribution."
  },
  {
    "id": "RL-IN-103",
    "technicalName": "laterality",
    "label": "左右",
    "groupId": "G09",
    "disposition": "SELF_REPORTED_REGION_STATE_COMPONENT",
    "numericPermission": "SELF_REPORTED_SEPARATE",
    "missingnessBehavior": "NOT_REVIEWED differs from REVIEWED_NO_AREA; absent report is not intensity 0 unless explicitly reviewed with no area.",
    "doubleCountingGuard": "RL-IN-101 observation array is canonical; this single-observation compatibility alias never creates an independent numeric or overlay contribution."
  },
  {
    "id": "RL-IN-104",
    "technicalName": "noticedIntensity",
    "label": "気になる程度",
    "groupId": "G09",
    "disposition": "SELF_REPORTED_REGION_STATE_COMPONENT",
    "numericPermission": "SELF_REPORTED_SEPARATE",
    "missingnessBehavior": "NOT_REVIEWED differs from REVIEWED_NO_AREA; absent report is not intensity 0 unless explicitly reviewed with no area.",
    "doubleCountingGuard": "RL-IN-101 observation array is canonical; this single-observation compatibility alias never creates an independent numeric or overlay contribution."
  },
  {
    "id": "RL-IN-105",
    "technicalName": "sensationType",
    "label": "感覚の種類",
    "groupId": "G09",
    "disposition": "SELF_REPORTED_REGION_STATE_COMPONENT",
    "numericPermission": "SELF_REPORTED_SEPARATE",
    "missingnessBehavior": "NOT_REVIEWED differs from REVIEWED_NO_AREA; absent report is not intensity 0 unless explicitly reviewed with no area.",
    "doubleCountingGuard": "RL-IN-101 observation array is canonical; this single-observation compatibility alias never creates an independent numeric or overlay contribution."
  },
  {
    "id": "RL-IN-106",
    "technicalName": "noticedTiming",
    "label": "気づいた時点",
    "groupId": "G09",
    "disposition": "SELF_REPORTED_REGION_STATE_COMPONENT",
    "numericPermission": "SELF_REPORTED_SEPARATE",
    "missingnessBehavior": "NOT_REVIEWED differs from REVIEWED_NO_AREA; absent report is not intensity 0 unless explicitly reviewed with no area.",
    "doubleCountingGuard": "RL-IN-101 observation array is canonical; this single-observation compatibility alias never creates an independent numeric or overlay contribution."
  },
  {
    "id": "RL-IN-107",
    "technicalName": "bodyAreaNote",
    "label": "部位メモ",
    "groupId": "G09",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-110",
    "technicalName": "runningStartDateOrBand",
    "label": "ランニング開始時期",
    "groupId": "G10",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-111",
    "technicalName": "experienceSelfAssessment",
    "label": "本人の経験認識",
    "groupId": "G10",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-112",
    "technicalName": "runningGoalTags[]",
    "label": "主な目的",
    "groupId": "G10",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-113",
    "technicalName": "heightCm",
    "label": "身長",
    "groupId": "G10",
    "disposition": "PERSONAL_REFERENCE_OR_MODIFIER",
    "numericPermission": "ROUTING_ONLY",
    "missingnessBehavior": "Missing => canonical app reference with disclosure only where permitted; otherwise applicability gate.",
    "doubleCountingGuard": "Normalization already embedded in source endpoint cannot be applied again."
  },
  {
    "id": "RL-IN-114",
    "technicalName": "weightKg",
    "label": "体重",
    "groupId": "G10",
    "disposition": "PERSONAL_REFERENCE_OR_MODIFIER",
    "numericPermission": "ROUTING_ONLY",
    "missingnessBehavior": "Missing => canonical app reference with disclosure only where permitted; otherwise applicability gate.",
    "doubleCountingGuard": "Normalization already embedded in source endpoint cannot be applied again."
  },
  {
    "id": "RL-IN-115",
    "technicalName": "ageBand",
    "label": "年齢帯",
    "groupId": "G10",
    "disposition": "PERSONAL_REFERENCE_OR_MODIFIER",
    "numericPermission": "ROUTING_ONLY",
    "missingnessBehavior": "Missing => canonical app reference with disclosure only where permitted; otherwise applicability gate.",
    "doubleCountingGuard": "Normalization already embedded in source endpoint cannot be applied again."
  },
  {
    "id": "RL-IN-116",
    "technicalName": "sexOrReferenceCategory",
    "label": "性別関連入力",
    "groupId": "G10",
    "disposition": "PERSONAL_REFERENCE_OR_MODIFIER",
    "numericPermission": "ROUTING_ONLY",
    "missingnessBehavior": "Missing => canonical app reference with disclosure only where permitted; otherwise applicability gate.",
    "doubleCountingGuard": "Normalization already embedded in source endpoint cannot be applied again."
  },
  {
    "id": "RL-IN-117",
    "technicalName": "sleepSummary",
    "label": "睡眠の自己記録",
    "groupId": "G10",
    "disposition": "SESSION_SUBJECTIVE_PARALLEL_COMPONENT",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing affects parallel context only, not mechanical index availability.",
    "doubleCountingGuard": "Not summed into mechanical C/E/I/P components."
  },
  {
    "id": "RL-IN-118",
    "technicalName": "nutritionHydrationSummary",
    "label": "食事・水分の自己記録",
    "groupId": "G10",
    "disposition": "SESSION_SUBJECTIVE_PARALLEL_COMPONENT",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing affects parallel context only, not mechanical index availability.",
    "doubleCountingGuard": "Not summed into mechanical C/E/I/P components."
  },
  {
    "id": "RL-IN-119",
    "technicalName": "lifestyleNote",
    "label": "生活背景メモ",
    "groupId": "G10",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-120",
    "technicalName": "reflectionKeyPoint",
    "label": "今回の主な気づき",
    "groupId": "G11",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-121",
    "technicalName": "nextCheckPoint",
    "label": "次回確認したいこと",
    "groupId": "G11",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-122",
    "technicalName": "consultationTarget",
    "label": "相談したい相手",
    "groupId": "G11",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-123",
    "technicalName": "consultationQuestion",
    "label": "相談したい内容",
    "groupId": "G11",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-124",
    "technicalName": "consultationDataSelection",
    "label": "共有する記録範囲",
    "groupId": "G11",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-130",
    "technicalName": "scheduledDate",
    "label": "予定日",
    "groupId": "G12",
    "disposition": "PLAN_ONLY_NO_COMPLETED_SESSION_EFFECT",
    "numericPermission": "PROHIBITED_FOR_COMPLETED_SESSION",
    "missingnessBehavior": "Missing has no effect on completed-session calculation.",
    "doubleCountingGuard": "Separate planned scenario namespace from actual session namespace."
  },
  {
    "id": "RL-IN-131",
    "technicalName": "planType",
    "label": "予定種別",
    "groupId": "G12",
    "disposition": "PLAN_ONLY_NO_COMPLETED_SESSION_EFFECT",
    "numericPermission": "PROHIBITED_FOR_COMPLETED_SESSION",
    "missingnessBehavior": "Missing has no effect on completed-session calculation.",
    "doubleCountingGuard": "Separate planned scenario namespace from actual session namespace."
  },
  {
    "id": "RL-IN-132",
    "technicalName": "plannedDistanceStatus",
    "label": "予定距離の状態",
    "groupId": "G12",
    "disposition": "PLAN_ONLY_NO_COMPLETED_SESSION_EFFECT",
    "numericPermission": "PROHIBITED_FOR_COMPLETED_SESSION",
    "missingnessBehavior": "Missing has no effect on completed-session calculation.",
    "doubleCountingGuard": "Separate planned scenario namespace from actual session namespace."
  },
  {
    "id": "RL-IN-133",
    "technicalName": "plannedDistanceKm",
    "label": "予定距離",
    "groupId": "G12",
    "disposition": "PLAN_ONLY_NO_COMPLETED_SESSION_EFFECT",
    "numericPermission": "PROHIBITED_FOR_COMPLETED_SESSION",
    "missingnessBehavior": "Missing has no effect on completed-session calculation.",
    "doubleCountingGuard": "Separate planned scenario namespace from actual session namespace."
  },
  {
    "id": "RL-IN-134",
    "technicalName": "plannedDurationStatus",
    "label": "予定時間の状態",
    "groupId": "G12",
    "disposition": "PLAN_ONLY_NO_COMPLETED_SESSION_EFFECT",
    "numericPermission": "PROHIBITED_FOR_COMPLETED_SESSION",
    "missingnessBehavior": "Missing has no effect on completed-session calculation.",
    "doubleCountingGuard": "Separate planned scenario namespace from actual session namespace."
  },
  {
    "id": "RL-IN-135",
    "technicalName": "plannedDurationMinutes",
    "label": "予定時間",
    "groupId": "G12",
    "disposition": "PLAN_ONLY_NO_COMPLETED_SESSION_EFFECT",
    "numericPermission": "PROHIBITED_FOR_COMPLETED_SESSION",
    "missingnessBehavior": "Missing has no effect on completed-session calculation.",
    "doubleCountingGuard": "Separate planned scenario namespace from actual session namespace."
  },
  {
    "id": "RL-IN-136",
    "technicalName": "plannedCourseSnapshot",
    "label": "予定コーススナップショット",
    "groupId": "G12",
    "disposition": "PLAN_ONLY_NO_COMPLETED_SESSION_EFFECT",
    "numericPermission": "PROHIBITED_FOR_COMPLETED_SESSION",
    "missingnessBehavior": "Missing has no effect on completed-session calculation.",
    "doubleCountingGuard": "Separate planned scenario namespace from actual session namespace."
  },
  {
    "id": "RL-IN-137",
    "technicalName": "planNote",
    "label": "予定メモ",
    "groupId": "G12",
    "disposition": "PLAN_ONLY_NO_COMPLETED_SESSION_EFFECT",
    "numericPermission": "PROHIBITED_FOR_COMPLETED_SESSION",
    "missingnessBehavior": "Missing has no effect on completed-session calculation.",
    "doubleCountingGuard": "Separate planned scenario namespace from actual session namespace."
  },
  {
    "id": "RL-IN-138",
    "technicalName": "planOutcomeStatus",
    "label": "実施状況",
    "groupId": "G12",
    "disposition": "PLAN_ONLY_NO_COMPLETED_SESSION_EFFECT",
    "numericPermission": "PROHIBITED_FOR_COMPLETED_SESSION",
    "missingnessBehavior": "Missing has no effect on completed-session calculation.",
    "doubleCountingGuard": "Separate planned scenario namespace from actual session namespace."
  },
  {
    "id": "RL-IN-139",
    "technicalName": "planChangeReason",
    "label": "変更・未実施理由",
    "groupId": "G12",
    "disposition": "PLAN_ONLY_NO_COMPLETED_SESSION_EFFECT",
    "numericPermission": "PROHIBITED_FOR_COMPLETED_SESSION",
    "missingnessBehavior": "Missing has no effect on completed-session calculation.",
    "doubleCountingGuard": "Separate planned scenario namespace from actual session namespace."
  },
  {
    "id": "RL-IN-140",
    "technicalName": "actualSessionId",
    "label": "実績記録参照",
    "groupId": "G12",
    "disposition": "PLAN_ONLY_NO_COMPLETED_SESSION_EFFECT",
    "numericPermission": "PROHIBITED_FOR_COMPLETED_SESSION",
    "missingnessBehavior": "Missing has no effect on completed-session calculation.",
    "doubleCountingGuard": "Separate planned scenario namespace from actual session namespace."
  }
]);
export const PARAMETERS = Object.freeze({
  "RCM-P-GLOBAL-QREF": 5.0,
  "RCM-P-GLOBAL-QREF-TIME": 30.0,
  "RCM-P-GLOBAL-QREF-STEPS": 5100.0,
  "RCM-P-GLOBAL-QREF-GAIT-CYCLES": 2550.0,
  "RCM-P-GLOBAL-ALPHAE": 1.0,
  "RCM-P-GLOBAL-VREF": 2.78,
  "RCM-P-GLOBAL-CADREF": 170.0,
  "RCM-P-GLOBAL-BETASTATE": 0.0,
  "RCM-P-GLOBAL-BPROJECT": 0.25,
  "RCM-P-GLOBAL-BINTER": 0.15,
  "RCM-P-015-WGMAX": 0.8,
  "RCM-P-015-WGMED": 0.2,
  "RCM-P-023-WSOL": 0.75,
  "RCM-P-023-WGAS": 0.25,
  "RCM-P-028-WARCH": 0.65,
  "RCM-P-028-WINTR": 0.2,
  "RCM-P-028-WPFA": 0.15,
  "RCM-P-024-WPOS": 0.5,
  "RCM-P-024-WNEG": 0.5,
  "RCM-P-014-KSPEED": 0.04,
  "RCM-P-014-KUP": 0.02,
  "RCM-P-014-KDOWN": 0.015,
  "RCM-P-015-KSPEED": 0.06,
  "RCM-P-016-KUP": 0.01,
  "RCM-P-018-KGRADE": 0.005,
  "RCM-P-023-KSOLSPD": 0.1,
  "RCM-P-023-KGASSPD": 0.06,
  "RCM-P-028-KSPEED": 0.08,
  "RCM-P-015-KGRADEMAIN": 0.0,
  "RCM-P-024-KGRADE": 0.0,
  "RCM-P-SURFACE-ORDINAL": 0.0,
  "RCM-P-BODYMASS-UNIVERSAL": 0.0,
  "RCM-P-PLAN-ACTUAL": 0.0,
  "RCM-P-028-KGAIT": 0.08
});
export const PARAMETER_BOUNDS = Object.freeze({
  "RCM-P-GLOBAL-QREF": {
    "lower": 5.0,
    "initial": 5.0,
    "upper": 5.0,
    "role": "FIXED_REFERENCE_NOT_SENSITIVITY_PARAMETER"
  },
  "RCM-P-GLOBAL-QREF-TIME": {
    "lower": 30.0,
    "initial": 30.0,
    "upper": 30.0,
    "role": "FIXED_ENDPOINT_FAMILY_REFERENCE"
  },
  "RCM-P-GLOBAL-QREF-STEPS": {
    "lower": 5100.0,
    "initial": 5100.0,
    "upper": 5100.0,
    "role": "FIXED_ENDPOINT_FAMILY_REFERENCE"
  },
  "RCM-P-GLOBAL-QREF-GAIT-CYCLES": {
    "lower": 2550.0,
    "initial": 2550.0,
    "upper": 2550.0,
    "role": "FIXED_ENDPOINT_FAMILY_REFERENCE"
  },
  "RCM-P-GLOBAL-ALPHAE": {
    "lower": 1.0,
    "initial": 1.0,
    "upper": 1.0,
    "role": "FIXED_LINEAR_REFERENCE_RATIO"
  },
  "RCM-P-GLOBAL-VREF": {
    "lower": 2.78,
    "initial": 2.78,
    "upper": 2.78,
    "role": "FIXED_OR_HARD_ZERO"
  },
  "RCM-P-GLOBAL-CADREF": {
    "lower": 170.0,
    "initial": 170.0,
    "upper": 170.0,
    "role": "FIXED_REFERENCE_NOT_SENSITIVITY_PARAMETER"
  },
  "RCM-P-GLOBAL-BETASTATE": {
    "lower": 0.0,
    "initial": 0.0,
    "upper": 0.0,
    "role": "FIXED_SEPARATE_OBSERVATION_OVERLAY"
  },
  "RCM-P-GLOBAL-BPROJECT": {
    "lower": 0.2,
    "initial": 0.25,
    "upper": 0.35,
    "role": "INDEPENDENT_BOUNDED_PARAMETER"
  },
  "RCM-P-GLOBAL-BINTER": {
    "lower": 0.1,
    "initial": 0.15,
    "upper": 0.2,
    "role": "INDEPENDENT_BOUNDED_PARAMETER"
  },
  "RCM-P-015-WGMAX": {
    "lower": 0.7,
    "initial": 0.8,
    "upper": 0.9,
    "role": "INDEPENDENT_SIMPLEX_DRIVER"
  },
  "RCM-P-015-WGMED": {
    "lower": 0.1,
    "initial": 0.2,
    "upper": 0.3,
    "role": "DEPENDENT_COMPLEMENT"
  },
  "RCM-P-023-WSOL": {
    "lower": 0.65,
    "initial": 0.75,
    "upper": 0.85,
    "role": "INDEPENDENT_SIMPLEX_DRIVER"
  },
  "RCM-P-023-WGAS": {
    "lower": 0.15,
    "initial": 0.25,
    "upper": 0.35,
    "role": "DEPENDENT_COMPLEMENT"
  },
  "RCM-P-028-WARCH": {
    "lower": 0.55,
    "initial": 0.65,
    "upper": 0.75,
    "role": "INDEPENDENT_SIMPLEX_DRIVER"
  },
  "RCM-P-028-WINTR": {
    "lower": 0.15,
    "initial": 0.2,
    "upper": 0.3,
    "role": "DEPENDENT_REMAINDER"
  },
  "RCM-P-028-WPFA": {
    "lower": 0.1,
    "initial": 0.15,
    "upper": 0.2,
    "role": "INDEPENDENT_SIMPLEX_DRIVER"
  },
  "RCM-P-024-WPOS": {
    "lower": 0.4,
    "initial": 0.5,
    "upper": 0.6,
    "role": "INDEPENDENT_SIMPLEX_DRIVER"
  },
  "RCM-P-024-WNEG": {
    "lower": 0.4,
    "initial": 0.5,
    "upper": 0.6,
    "role": "DEPENDENT_COMPLEMENT"
  },
  "RCM-P-014-KSPEED": {
    "lower": 0.02,
    "initial": 0.04,
    "upper": 0.08,
    "role": "INDEPENDENT_BOUNDED_PARAMETER"
  },
  "RCM-P-014-KUP": {
    "lower": 0.01,
    "initial": 0.02,
    "upper": 0.03,
    "role": "INDEPENDENT_BOUNDED_PARAMETER"
  },
  "RCM-P-014-KDOWN": {
    "lower": 0.008,
    "initial": 0.015,
    "upper": 0.025,
    "role": "INDEPENDENT_BOUNDED_PARAMETER"
  },
  "RCM-P-015-KSPEED": {
    "lower": 0.03,
    "initial": 0.06,
    "upper": 0.1,
    "role": "INDEPENDENT_BOUNDED_PARAMETER"
  },
  "RCM-P-016-KUP": {
    "lower": 0.005,
    "initial": 0.01,
    "upper": 0.02,
    "role": "INDEPENDENT_BOUNDED_PARAMETER"
  },
  "RCM-P-018-KGRADE": {
    "lower": 0.002,
    "initial": 0.005,
    "upper": 0.01,
    "role": "INDEPENDENT_BOUNDED_PARAMETER"
  },
  "RCM-P-023-KSOLSPD": {
    "lower": 0.06,
    "initial": 0.1,
    "upper": 0.14,
    "role": "INDEPENDENT_BOUNDED_PARAMETER"
  },
  "RCM-P-023-KGASSPD": {
    "lower": 0.03,
    "initial": 0.06,
    "upper": 0.1,
    "role": "INDEPENDENT_BOUNDED_PARAMETER"
  },
  "RCM-P-028-KSPEED": {
    "lower": 0.04,
    "initial": 0.08,
    "upper": 0.12,
    "role": "INDEPENDENT_BOUNDED_PARAMETER"
  },
  "RCM-P-015-KGRADEMAIN": {
    "lower": 0.0,
    "initial": 0.0,
    "upper": 0.0,
    "role": "FIXED_OR_HARD_ZERO"
  },
  "RCM-P-024-KGRADE": {
    "lower": 0.0,
    "initial": 0.0,
    "upper": 0.0,
    "role": "FIXED_OR_HARD_ZERO"
  },
  "RCM-P-SURFACE-ORDINAL": {
    "lower": 0.0,
    "initial": 0.0,
    "upper": 0.0,
    "role": "FIXED_OR_HARD_ZERO"
  },
  "RCM-P-BODYMASS-UNIVERSAL": {
    "lower": 0.0,
    "initial": 0.0,
    "upper": 0.0,
    "role": "FIXED_OR_HARD_ZERO"
  },
  "RCM-P-PLAN-ACTUAL": {
    "lower": 0.0,
    "initial": 0.0,
    "upper": 0.0,
    "role": "FIXED_OR_HARD_ZERO"
  },
  "RCM-P-028-KGAIT": {
    "lower": 0.03,
    "initial": 0.08,
    "upper": 0.12,
    "role": "INDEPENDENT_BOUNDED_PARAMETER"
  }
});
export const SOURCE_CURVES = Object.freeze({
  "BA-DISP-019": {
    "speed": [
      [
        2.78,
        1.0
      ],
      [
        3.0,
        0.942821
      ],
      [
        3.33,
        0.885642
      ],
      [
        4.0,
        0.797967
      ],
      [
        5.0,
        0.701398
      ]
    ],
    "grade": [
      [
        -6.0,
        1.222363
      ],
      [
        -3.0,
        1.080051
      ],
      [
        0.0,
        1.0
      ],
      [
        3.0,
        0.931385
      ],
      [
        6.0,
        0.893266
      ]
    ],
    "cadence": [
      [
        -10.0,
        0.995696
      ],
      [
        0.0,
        1.0
      ],
      [
        10.0,
        0.974175
      ]
    ]
  },
  "BA-DISP-021": {
    "speed": [
      [
        2.78,
        1.0
      ],
      [
        3.0,
        0.935608
      ],
      [
        3.33,
        0.849243
      ],
      [
        4.0,
        0.753542
      ],
      [
        5.0,
        0.627978
      ]
    ],
    "grade": [
      [
        -6.0,
        1.068496
      ],
      [
        -3.0,
        0.998149
      ],
      [
        0.0,
        1.0
      ],
      [
        3.0,
        1.010383
      ],
      [
        6.0,
        1.060126
      ]
    ],
    "cadence": [
      [
        -10.0,
        1.003412
      ],
      [
        0.0,
        1.0
      ],
      [
        10.0,
        0.99166
      ]
    ]
  },
  "BA-DISP-025": {
    "speed": [
      [
        2.78,
        1.0
      ],
      [
        3.0,
        0.940774
      ],
      [
        3.33,
        0.851936
      ],
      [
        4.0,
        0.740319
      ],
      [
        5.0,
        0.605923
      ]
    ],
    "grade": [
      [
        -6.0,
        0.738041
      ],
      [
        -3.0,
        0.835991
      ],
      [
        0.0,
        1.0
      ],
      [
        3.0,
        1.175399
      ],
      [
        6.0,
        1.3918
      ]
    ],
    "cadence": [
      [
        -10.0,
        1.064171
      ],
      [
        0.0,
        1.0
      ],
      [
        10.0,
        0.989305
      ]
    ]
  }
});
export const SURFACE_CURVES = Object.freeze({
  "BA-DISP-027": {
    "Asphalt": 1.0,
    "Concrete": 1.009648,
    "Grass": 0.950314,
    "Rubber": 0.990835
  },
  "BA-DISP-029": {
    "Asphalt": 1.0,
    "Concrete": 0.965302,
    "Grass": 0.942822,
    "Rubber": 0.963348
  }
});
// RCM-SRC-003 / Abdul Yamin et al. 2021, Table 3. Peak MLA angle under
// heeled-shoe conditions, normalized to Concrete. This is an exact categorical
// endpoint route, not a generic surface-hardness coefficient.
export const ARCH_SURFACE_CURVES = Object.freeze({
  "Concrete": 1.0,
  "Rubber": 0.971639866599
});
export const PFA_CURVE = Object.freeze({
  "RFS": 1.0,
  "MFS": 1.214516,
  "FFS": 1.445161
});
// BAT-SRC-009: GM is gastrocnemius medialis; MG is gluteus major.
// These exact protocol curves must not be generalized beyond 4.17 m/s and 0/2/7% treadmill grades.
export const GASTRO_GRADE_CURVE = Object.freeze([[0, 1.0], [2, 1.0009], [7, 0.9584]]);
export const GLUTE_GRADE_CURVE = Object.freeze([[0, 1.0], [2, 1.4142], [7, 1.8327]]);

// BAT-SRC-019 descriptive group-mean grade×speed data. Ratios are normalized
// to the source level condition and are retained for provenance/reproduction
// only in R21. The published speeds are group means from participant-specific
// speed prescriptions, not common protocol targets or individual eligibility
// tolerances. The app cannot reconstruct the source participant-specific 10-km
// performance prescription, so this profile is not numeric-runtime eligible.
export const GRADE_SPEED_PROFILE = Object.freeze({
  gradePercent: [-15, -10, -5, 0, 5, 10, 15],
  speedMps: [3.75, 3.583333333333, 3.416666666667, 3.055555555556, 2.277777777778, 1.805555555556, 1.5],
  "BA-DISP-015": {
    gmax: [1.059829059829, 1.135042735043, 0.958974358974, 1, 1.117948717949, 1.217094017094, 1.107692307692],
    gmed: [1.042990654206, 1.153271028037, 1.108411214953, 1, 1.020560747664, 1.03738317757, 1.166355140187]
  },
  "BA-DISP-016": [1.128623188406, 1.164855072464, 1.123188405797, 1, 1.179347826087, 1.101449275362, 1.184782608696],
  "BA-DISP-018": [1.047451669596, 1.137082601054, 1.082601054482, 1, 1.186291739895, 1.138840070299, 1.186291739895],
  "BA-DISP-023": [1.261728395062, 1.093827160494, 1.00987654321, 1, 1.259259259259, 1.333333333333, 1.234567901235]
});

// BAT-SRC-027 source-reported uneven/even endpoint ratios at the study's
// single artificial uneven-treadmill condition (2.3 m/s; height variation up
// to about 2.5 cm). R20 retains these values for provenance only. The app's
// ordinal unevennessLevel 1-5 scale is NOT a source scale, and these endpoints
// are not numeric-runtime eligible without an exact representation of the
// source apparatus/protocol.
export const UNEVENNESS_UPPER_BOUND_CURVES = Object.freeze({
  "BA-DISP-016": 1.07,
  "BA-DISP-018": 1.19,
  "BA-DISP-024": 0.80
});
export const SURFACE_PRESETS = Object.freeze({
  "paved": {
    "key": "paved",
    "label": "舗装路",
    "materialLabel": "PAVED",
    "runSetting": "OUTDOOR_ROUTE",
    "hardnessLevel": 5,
    "unevennessLevel": 1,
    "gripLevel": 4,
    "sinkLevel": 1,
    "reboundLevel": 2,
    "stabilityLevel": 5,
    "wetSlipDefault": "UNKNOWN",
    "exactSourceCategory": "ASPHALT_REFERENCE_ZERO_ONLY",
    "numericRouteDefault": "REFERENCE_ZERO_ONLY",
    "confidence": "MODERATE"
  },
  "track": {
    "key": "track",
    "label": "陸上トラック",
    "materialLabel": "TRACK_RUBBER",
    "runSetting": "TRACK",
    "hardnessLevel": 3,
    "unevennessLevel": 1,
    "gripLevel": 4,
    "sinkLevel": 1,
    "reboundLevel": 5,
    "stabilityLevel": 5,
    "wetSlipDefault": "UNKNOWN",
    "exactSourceCategory": "RUBBER",
    "numericRouteDefault": "SOURCE_GATED_CANDIDATE",
    "confidence": "MODERATE"
  },
  "treadmill": {
    "key": "treadmill",
    "label": "トレッドミル",
    "materialLabel": "TREADMILL_BELT",
    "runSetting": "TREADMILL",
    "hardnessLevel": 3,
    "unevennessLevel": 1,
    "gripLevel": 4,
    "sinkLevel": 1,
    "reboundLevel": 4,
    "stabilityLevel": 5,
    "wetSlipDefault": "UNKNOWN",
    "exactSourceCategory": "NONE",
    "numericRouteDefault": "ROUTING_ONLY",
    "confidence": "MODERATE"
  },
  "soil": {
    "key": "soil",
    "label": "締まった土道",
    "materialLabel": "COMPACTED_SOIL",
    "runSetting": "OUTDOOR_ROUTE",
    "hardnessLevel": 3,
    "unevennessLevel": 2,
    "gripLevel": 3,
    "sinkLevel": 2,
    "reboundLevel": 2,
    "stabilityLevel": 3,
    "wetSlipDefault": "UNKNOWN",
    "exactSourceCategory": "NONE",
    "numericRouteDefault": "TRACE_AND_COVERAGE_ONLY",
    "confidence": "LOW_TO_MODERATE"
  },
  "trail": {
    "key": "trail",
    "label": "不整地トレイル",
    "materialLabel": "TRAIL_UNEVEN",
    "runSetting": "OUTDOOR_ROUTE",
    "hardnessLevel": "UNKNOWN",
    "unevennessLevel": 5,
    "gripLevel": "UNKNOWN",
    "sinkLevel": "UNKNOWN",
    "reboundLevel": 1,
    "stabilityLevel": 2,
    "wetSlipDefault": "UNKNOWN",
    "exactSourceCategory": "NONE",
    "numericRouteDefault": "NO_GENERIC_NUMERIC_ROUTE",
    "confidence": "LOW"
  },
  "natural_grass": {
    "key": "natural_grass",
    "label": "芝生",
    "materialLabel": "NATURAL_GRASS",
    "runSetting": "OUTDOOR_ROUTE",
    "hardnessLevel": 2,
    "unevennessLevel": 2,
    "gripLevel": 3,
    "sinkLevel": 3,
    "reboundLevel": 2,
    "stabilityLevel": 3,
    "wetSlipDefault": "UNKNOWN",
    "exactSourceCategory": "GRASS",
    "numericRouteDefault": "SOURCE_GATED_CANDIDATE",
    "confidence": "MODERATE"
  },
  "artificial_turf": {
    "key": "artificial_turf",
    "label": "人工芝",
    "materialLabel": "ARTIFICIAL_TURF",
    "runSetting": "OUTDOOR_ROUTE",
    "hardnessLevel": "UNKNOWN",
    "unevennessLevel": 1,
    "gripLevel": 4,
    "sinkLevel": 1,
    "reboundLevel": 4,
    "stabilityLevel": 4,
    "wetSlipDefault": "UNKNOWN",
    "exactSourceCategory": "NONE",
    "numericRouteDefault": "TRACE_AND_COVERAGE_ONLY",
    "confidence": "LOW_TO_MODERATE"
  },
  "sand": {
    "key": "sand",
    "label": "砂地",
    "materialLabel": "SAND",
    "runSetting": "OUTDOOR_ROUTE",
    "hardnessLevel": 1,
    "unevennessLevel": 3,
    "gripLevel": 2,
    "sinkLevel": 5,
    "reboundLevel": 1,
    "stabilityLevel": 1,
    "wetSlipDefault": "UNKNOWN",
    "exactSourceCategory": "NONE",
    "numericRouteDefault": "NO_GENERIC_NUMERIC_ROUTE",
    "confidence": "MODERATE_FOR_DIRECTIONAL_PROPERTIES"
  }
});
export const ORACLE_EXPECTED = Object.freeze({
  "P9-REF-5KM": {
    "BA-DISP-014": 100.0,
    "BA-DISP-015": 100.0,
    "BA-DISP-016": 100.0,
    "BA-DISP-018": 100.0,
    "BA-DISP-019": 100.0,
    "BA-DISP-021": 100.0,
    "BA-DISP-023": 100.0,
    "BA-DISP-024": 100.0,
    "BA-DISP-025": 100.0,
    "BA-DISP-027": 100.0,
    "BA-DISP-028": 100.0,
    "BA-DISP-029": 100.0
  },
  "P9-EXPOSURE-10KM": {
    "BA-DISP-014": 141.421356,
    "BA-DISP-015": 141.421356,
    "BA-DISP-016": 141.421356,
    "BA-DISP-018": 141.421356,
    "BA-DISP-019": 141.421356,
    "BA-DISP-021": 141.421356,
    "BA-DISP-023": 141.421356,
    "BA-DISP-024": 141.421356,
    "BA-DISP-025": 141.421356,
    "BA-DISP-027": 141.421356,
    "BA-DISP-028": 141.421356,
    "BA-DISP-029": 141.421356
  },
  "P9-EXPOSURE-2P5KM": {
    "BA-DISP-014": 70.710678,
    "BA-DISP-015": 70.710678,
    "BA-DISP-016": 70.710678,
    "BA-DISP-018": 70.710678,
    "BA-DISP-019": 70.710678,
    "BA-DISP-021": 70.710678,
    "BA-DISP-023": 70.710678,
    "BA-DISP-024": 70.710678,
    "BA-DISP-025": 70.710678,
    "BA-DISP-027": 70.710678,
    "BA-DISP-028": 70.710678,
    "BA-DISP-029": 70.710678
  },
  "P9-UPHILL-6": {
    "BA-DISP-014": 111.802,
    "BA-DISP-015": 100.0,
    "BA-DISP-016": 106.064,
    "BA-DISP-018": 100.0,
    "BA-DISP-019": 89.327,
    "BA-DISP-021": 106.013,
    "BA-DISP-023": 100.0,
    "BA-DISP-024": 100.0,
    "BA-DISP-025": 139.18,
    "BA-DISP-027": 100.0,
    "BA-DISP-028": 100.0,
    "BA-DISP-029": 100.0
  },
  "P9-DOWNHILL-6": {
    "BA-DISP-014": 109.014,
    "BA-DISP-015": 100.0,
    "BA-DISP-016": 100.0,
    "BA-DISP-018": 100.0,
    "BA-DISP-019": 122.236,
    "BA-DISP-021": 106.85,
    "BA-DISP-023": 100.0,
    "BA-DISP-024": 100.0,
    "BA-DISP-025": 73.804,
    "BA-DISP-027": 100.0,
    "BA-DISP-028": 100.0,
    "BA-DISP-029": 100.0
  },
  "P9-SPEED-5MS": {
    "BA-DISP-014": 108.898,
    "BA-DISP-015": 112.962,
    "BA-DISP-016": 100.0,
    "BA-DISP-018": 100.0,
    "BA-DISP-019": 70.14,
    "BA-DISP-021": 62.798,
    "BA-DISP-023": 117.783,
    "BA-DISP-024": 100.0,
    "BA-DISP-025": 60.592,
    "BA-DISP-027": 100.0,
    "BA-DISP-028": 110.437,
    "BA-DISP-029": 100.0
  },
  "P9-CADENCE-PLUS10": {
    "BA-DISP-014": 100.0,
    "BA-DISP-015": 100.0,
    "BA-DISP-016": 100.0,
    "BA-DISP-018": 100.0,
    "BA-DISP-019": 97.418,
    "BA-DISP-021": 99.166,
    "BA-DISP-023": 100.0,
    "BA-DISP-024": 100.0,
    "BA-DISP-025": 98.93,
    "BA-DISP-027": 100.0,
    "BA-DISP-028": 100.0,
    "BA-DISP-029": 100.0
  },
  "P9-UNEVEN-EXACT": {
    "BA-DISP-014": 98.102,
    "BA-DISP-015": 97.173,
    "BA-DISP-016": 107.0,
    "BA-DISP-018": 119.0,
    "BA-DISP-019": 100.0,
    "BA-DISP-021": 100.0,
    "BA-DISP-023": 95.817,
    "BA-DISP-024": 80.0,
    "BA-DISP-025": 100.0,
    "BA-DISP-027": 100.0,
    "BA-DISP-028": 97.554,
    "BA-DISP-029": 100.0
  },
  "P9-GRASS-EXACT": {
    "BA-DISP-014": 102.232,
    "BA-DISP-015": 103.356,
    "BA-DISP-016": 100.0,
    "BA-DISP-018": 100.0,
    "BA-DISP-019": 100.0,
    "BA-DISP-021": 100.0,
    "BA-DISP-023": 105.031,
    "BA-DISP-024": 100.0,
    "BA-DISP-025": 100.0,
    "BA-DISP-027": 95.031,
    "BA-DISP-028": 102.889,
    "BA-DISP-029": 94.282
  },
  "P9-CALF-UP2": {
    "BA-DISP-014": 109.549,
    "BA-DISP-015": 108.376,
    "BA-DISP-016": 102.016,
    "BA-DISP-018": 100.0,
    "BA-DISP-019": 100.0,
    "BA-DISP-021": 100.0,
    "BA-DISP-023": 119.881,
    "BA-DISP-024": 100.0,
    "BA-DISP-025": 100.0,
    "BA-DISP-027": 100.0,
    "BA-DISP-028": 107.022,
    "BA-DISP-029": 100.0
  },
  "P9-CALF-UP7": {
    "BA-DISP-014": 117.765,
    "BA-DISP-015": 108.376,
    "BA-DISP-016": 107.061,
    "BA-DISP-018": 100.0,
    "BA-DISP-019": 100.0,
    "BA-DISP-021": 100.0,
    "BA-DISP-023": 127.907,
    "BA-DISP-024": 100.0,
    "BA-DISP-025": 100.0,
    "BA-DISP-027": 100.0,
    "BA-DISP-028": 107.022,
    "BA-DISP-029": 100.0
  },
  "P9-ARCH-FFS": {
    "BA-DISP-014": 100.0,
    "BA-DISP-015": 100.0,
    "BA-DISP-016": 100.0,
    "BA-DISP-018": 100.0,
    "BA-DISP-019": 100.0,
    "BA-DISP-021": 100.0,
    "BA-DISP-023": 100.0,
    "BA-DISP-024": 100.0,
    "BA-DISP-025": 100.0,
    "BA-DISP-027": 100.0,
    "BA-DISP-028": 105.679,
    "BA-DISP-029": 100.0
  },
  "P9-ARCH-WALK": {
    "BA-DISP-014": 100.0,
    "BA-DISP-015": 100.0,
    "BA-DISP-016": 100.0,
    "BA-DISP-018": 100.0,
    "BA-DISP-019": 100.0,
    "BA-DISP-021": 100.0,
    "BA-DISP-023": 100.0,
    "BA-DISP-024": 100.0,
    "BA-DISP-025": 100.0,
    "BA-DISP-027": 100.0,
    "BA-DISP-028": 92.311635,
    "BA-DISP-029": 100.0
  },
  "P9-MIX-UPDOWN-50": {
    "BA-DISP-014": 110.399199,
    "BA-DISP-015": 100.0,
    "BA-DISP-016": 102.987378,
    "BA-DISP-018": 100.0,
    "BA-DISP-019": 104.4939,
    "BA-DISP-021": 106.430677,
    "BA-DISP-023": 100.0,
    "BA-DISP-024": 100.0,
    "BA-DISP-025": 101.351077,
    "BA-DISP-027": 100.0,
    "BA-DISP-028": 100.0,
    "BA-DISP-029": 100.0
  },
  "P9-MIX-GRASS-50": {
    "BA-DISP-014": 101.109841,
    "BA-DISP-015": 101.664153,
    "BA-DISP-016": 100.0,
    "BA-DISP-018": 100.0,
    "BA-DISP-019": 100.0,
    "BA-DISP-021": 100.0,
    "BA-DISP-023": 102.484633,
    "BA-DISP-024": 100.0,
    "BA-DISP-025": 100.0,
    "BA-DISP-027": 97.483845,
    "BA-DISP-028": 101.434215,
    "BA-DISP-029": 97.098919
  },
  "P9-NOLEAK-PLAN": {
    "BA-DISP-014": 100.0,
    "BA-DISP-015": 100.0,
    "BA-DISP-016": 100.0,
    "BA-DISP-018": 100.0,
    "BA-DISP-019": 100.0,
    "BA-DISP-021": 100.0,
    "BA-DISP-023": 100.0,
    "BA-DISP-024": 100.0,
    "BA-DISP-025": 100.0,
    "BA-DISP-027": 100.0,
    "BA-DISP-028": 100.0,
    "BA-DISP-029": 100.0
  },
  "P9-NOLEAK-BODYMASS": {
    "BA-DISP-014": 100.0,
    "BA-DISP-015": 100.0,
    "BA-DISP-016": 100.0,
    "BA-DISP-018": 100.0,
    "BA-DISP-019": 100.0,
    "BA-DISP-021": 100.0,
    "BA-DISP-023": 100.0,
    "BA-DISP-024": 100.0,
    "BA-DISP-025": 100.0,
    "BA-DISP-027": 100.0,
    "BA-DISP-028": 100.0,
    "BA-DISP-029": 100.0
  },
  "P9-NOLEAK-SURFACE-ORDINAL": {
    "BA-DISP-014": 100.0,
    "BA-DISP-015": 100.0,
    "BA-DISP-016": 100.0,
    "BA-DISP-018": 100.0,
    "BA-DISP-019": 100.0,
    "BA-DISP-021": 100.0,
    "BA-DISP-023": 100.0,
    "BA-DISP-024": 100.0,
    "BA-DISP-025": 100.0,
    "BA-DISP-027": 100.0,
    "BA-DISP-028": 100.0,
    "BA-DISP-029": 100.0
  },
  "P9-SEGMENT-EQUIVALENCE": {
    "BA-DISP-014": 100.0,
    "BA-DISP-015": 100.0,
    "BA-DISP-016": 100.0,
    "BA-DISP-018": 100.0,
    "BA-DISP-019": 100.0,
    "BA-DISP-021": 100.0,
    "BA-DISP-023": 100.0,
    "BA-DISP-024": 100.0,
    "BA-DISP-025": 100.0,
    "BA-DISP-027": 100.0,
    "BA-DISP-028": 100.0,
    "BA-DISP-029": 100.0
  },
  "P9-MISSING-EXPOSURE": {
    "BA-DISP-014": null,
    "BA-DISP-015": null,
    "BA-DISP-016": null,
    "BA-DISP-018": null,
    "BA-DISP-019": null,
    "BA-DISP-021": null,
    "BA-DISP-023": null,
    "BA-DISP-024": null,
    "BA-DISP-025": null,
    "BA-DISP-027": null,
    "BA-DISP-028": null,
    "BA-DISP-029": null
  },
  "P9-UNKNOWN-SURFACE": {
    "BA-DISP-014": 100.0,
    "BA-DISP-015": 100.0,
    "BA-DISP-016": 100.0,
    "BA-DISP-018": 100.0,
    "BA-DISP-019": 100.0,
    "BA-DISP-021": 100.0,
    "BA-DISP-023": 100.0,
    "BA-DISP-024": 100.0,
    "BA-DISP-025": 100.0,
    "BA-DISP-027": null,
    "BA-DISP-028": 100.0,
    "BA-DISP-029": null
  },
  "P9-OOR-SPEED-6MS": {
    "BA-DISP-014": null,
    "BA-DISP-015": null,
    "BA-DISP-016": null,
    "BA-DISP-018": null,
    "BA-DISP-019": null,
    "BA-DISP-021": null,
    "BA-DISP-023": null,
    "BA-DISP-024": null,
    "BA-DISP-025": null,
    "BA-DISP-027": null,
    "BA-DISP-028": null,
    "BA-DISP-029": null
  }
});
export const ORACLE_STATUS = Object.freeze({
  "P9-REF-5KM": {
    "BA-DISP-014": "CALCULATED",
    "BA-DISP-015": "CALCULATED",
    "BA-DISP-016": "CALCULATED",
    "BA-DISP-018": "CALCULATED",
    "BA-DISP-019": "CALCULATED",
    "BA-DISP-021": "CALCULATED",
    "BA-DISP-023": "CALCULATED",
    "BA-DISP-024": "CALCULATED",
    "BA-DISP-025": "CALCULATED",
    "BA-DISP-027": "CALCULATED",
    "BA-DISP-028": "CALCULATED",
    "BA-DISP-029": "CALCULATED"
  },
  "P9-EXPOSURE-10KM": {
    "BA-DISP-014": "CALCULATED",
    "BA-DISP-015": "CALCULATED",
    "BA-DISP-016": "CALCULATED",
    "BA-DISP-018": "CALCULATED",
    "BA-DISP-019": "CALCULATED",
    "BA-DISP-021": "CALCULATED",
    "BA-DISP-023": "CALCULATED",
    "BA-DISP-024": "CALCULATED",
    "BA-DISP-025": "CALCULATED",
    "BA-DISP-027": "CALCULATED",
    "BA-DISP-028": "CALCULATED",
    "BA-DISP-029": "CALCULATED"
  },
  "P9-EXPOSURE-2P5KM": {
    "BA-DISP-014": "CALCULATED",
    "BA-DISP-015": "CALCULATED",
    "BA-DISP-016": "CALCULATED",
    "BA-DISP-018": "CALCULATED",
    "BA-DISP-019": "CALCULATED",
    "BA-DISP-021": "CALCULATED",
    "BA-DISP-023": "CALCULATED",
    "BA-DISP-024": "CALCULATED",
    "BA-DISP-025": "CALCULATED",
    "BA-DISP-027": "CALCULATED",
    "BA-DISP-028": "CALCULATED",
    "BA-DISP-029": "CALCULATED"
  },
  "P9-UPHILL-6": {
    "BA-DISP-014": "CALCULATED",
    "BA-DISP-015": "CALCULATED",
    "BA-DISP-016": "CALCULATED",
    "BA-DISP-018": "CALCULATED",
    "BA-DISP-019": "CALCULATED",
    "BA-DISP-021": "CALCULATED",
    "BA-DISP-023": "CALCULATED",
    "BA-DISP-024": "CALCULATED",
    "BA-DISP-025": "CALCULATED",
    "BA-DISP-027": "CALCULATED",
    "BA-DISP-028": "CALCULATED",
    "BA-DISP-029": "CALCULATED"
  },
  "P9-DOWNHILL-6": {
    "BA-DISP-014": "CALCULATED",
    "BA-DISP-015": "CALCULATED",
    "BA-DISP-016": "CALCULATED",
    "BA-DISP-018": "CALCULATED",
    "BA-DISP-019": "CALCULATED",
    "BA-DISP-021": "CALCULATED",
    "BA-DISP-023": "CALCULATED",
    "BA-DISP-024": "CALCULATED",
    "BA-DISP-025": "CALCULATED",
    "BA-DISP-027": "CALCULATED",
    "BA-DISP-028": "CALCULATED",
    "BA-DISP-029": "CALCULATED"
  },
  "P9-SPEED-5MS": {
    "BA-DISP-014": "CALCULATED",
    "BA-DISP-015": "CALCULATED",
    "BA-DISP-016": "CALCULATED",
    "BA-DISP-018": "CALCULATED",
    "BA-DISP-019": "CALCULATED",
    "BA-DISP-021": "CALCULATED",
    "BA-DISP-023": "CALCULATED",
    "BA-DISP-024": "CALCULATED",
    "BA-DISP-025": "CALCULATED",
    "BA-DISP-027": "CALCULATED",
    "BA-DISP-028": "CALCULATED",
    "BA-DISP-029": "CALCULATED"
  },
  "P9-CADENCE-PLUS10": {
    "BA-DISP-014": "CALCULATED",
    "BA-DISP-015": "CALCULATED",
    "BA-DISP-016": "CALCULATED",
    "BA-DISP-018": "CALCULATED",
    "BA-DISP-019": "CALCULATED",
    "BA-DISP-021": "CALCULATED",
    "BA-DISP-023": "CALCULATED",
    "BA-DISP-024": "CALCULATED",
    "BA-DISP-025": "CALCULATED",
    "BA-DISP-027": "CALCULATED",
    "BA-DISP-028": "CALCULATED",
    "BA-DISP-029": "CALCULATED"
  },
  "P9-UNEVEN-EXACT": {
    "BA-DISP-014": "CALCULATED",
    "BA-DISP-015": "CALCULATED",
    "BA-DISP-016": "CALCULATED",
    "BA-DISP-018": "CALCULATED",
    "BA-DISP-019": "CALCULATED",
    "BA-DISP-021": "CALCULATED",
    "BA-DISP-023": "CALCULATED",
    "BA-DISP-024": "CALCULATED",
    "BA-DISP-025": "CALCULATED",
    "BA-DISP-027": "CALCULATED",
    "BA-DISP-028": "CALCULATED",
    "BA-DISP-029": "CALCULATED"
  },
  "P9-GRASS-EXACT": {
    "BA-DISP-014": "CALCULATED",
    "BA-DISP-015": "CALCULATED",
    "BA-DISP-016": "CALCULATED",
    "BA-DISP-018": "CALCULATED",
    "BA-DISP-019": "CALCULATED",
    "BA-DISP-021": "CALCULATED",
    "BA-DISP-023": "CALCULATED",
    "BA-DISP-024": "CALCULATED",
    "BA-DISP-025": "CALCULATED",
    "BA-DISP-027": "CALCULATED",
    "BA-DISP-028": "CALCULATED",
    "BA-DISP-029": "CALCULATED"
  },
  "P9-CALF-UP2": {
    "BA-DISP-014": "CALCULATED",
    "BA-DISP-015": "CALCULATED",
    "BA-DISP-016": "CALCULATED",
    "BA-DISP-018": "CALCULATED",
    "BA-DISP-019": "CALCULATED",
    "BA-DISP-021": "CALCULATED",
    "BA-DISP-023": "CALCULATED",
    "BA-DISP-024": "CALCULATED",
    "BA-DISP-025": "CALCULATED",
    "BA-DISP-027": "CALCULATED",
    "BA-DISP-028": "CALCULATED",
    "BA-DISP-029": "CALCULATED"
  },
  "P9-CALF-UP7": {
    "BA-DISP-014": "CALCULATED",
    "BA-DISP-015": "CALCULATED",
    "BA-DISP-016": "CALCULATED",
    "BA-DISP-018": "CALCULATED",
    "BA-DISP-019": "CALCULATED",
    "BA-DISP-021": "CALCULATED",
    "BA-DISP-023": "CALCULATED",
    "BA-DISP-024": "CALCULATED",
    "BA-DISP-025": "CALCULATED",
    "BA-DISP-027": "CALCULATED",
    "BA-DISP-028": "CALCULATED",
    "BA-DISP-029": "CALCULATED"
  },
  "P9-ARCH-FFS": {
    "BA-DISP-014": "CALCULATED",
    "BA-DISP-015": "CALCULATED",
    "BA-DISP-016": "CALCULATED",
    "BA-DISP-018": "CALCULATED",
    "BA-DISP-019": "CALCULATED",
    "BA-DISP-021": "CALCULATED",
    "BA-DISP-023": "CALCULATED",
    "BA-DISP-024": "CALCULATED",
    "BA-DISP-025": "CALCULATED",
    "BA-DISP-027": "CALCULATED",
    "BA-DISP-028": "CALCULATED",
    "BA-DISP-029": "CALCULATED"
  },
  "P9-ARCH-WALK": {
    "BA-DISP-014": "CALCULATED",
    "BA-DISP-015": "CALCULATED",
    "BA-DISP-016": "CALCULATED",
    "BA-DISP-018": "CALCULATED",
    "BA-DISP-019": "CALCULATED",
    "BA-DISP-021": "CALCULATED",
    "BA-DISP-023": "CALCULATED",
    "BA-DISP-024": "CALCULATED",
    "BA-DISP-025": "CALCULATED",
    "BA-DISP-027": "CALCULATED",
    "BA-DISP-028": "CALCULATED",
    "BA-DISP-029": "CALCULATED"
  },
  "P9-MIX-UPDOWN-50": {
    "BA-DISP-014": "CALCULATED",
    "BA-DISP-015": "CALCULATED",
    "BA-DISP-016": "CALCULATED",
    "BA-DISP-018": "CALCULATED",
    "BA-DISP-019": "CALCULATED",
    "BA-DISP-021": "CALCULATED",
    "BA-DISP-023": "CALCULATED",
    "BA-DISP-024": "CALCULATED",
    "BA-DISP-025": "CALCULATED",
    "BA-DISP-027": "CALCULATED",
    "BA-DISP-028": "CALCULATED",
    "BA-DISP-029": "CALCULATED"
  },
  "P9-MIX-GRASS-50": {
    "BA-DISP-014": "CALCULATED",
    "BA-DISP-015": "CALCULATED",
    "BA-DISP-016": "CALCULATED",
    "BA-DISP-018": "CALCULATED",
    "BA-DISP-019": "CALCULATED",
    "BA-DISP-021": "CALCULATED",
    "BA-DISP-023": "CALCULATED",
    "BA-DISP-024": "CALCULATED",
    "BA-DISP-025": "CALCULATED",
    "BA-DISP-027": "CALCULATED",
    "BA-DISP-028": "CALCULATED",
    "BA-DISP-029": "CALCULATED"
  },
  "P9-NOLEAK-PLAN": {
    "BA-DISP-014": "CALCULATED",
    "BA-DISP-015": "CALCULATED",
    "BA-DISP-016": "CALCULATED",
    "BA-DISP-018": "CALCULATED",
    "BA-DISP-019": "CALCULATED",
    "BA-DISP-021": "CALCULATED",
    "BA-DISP-023": "CALCULATED",
    "BA-DISP-024": "CALCULATED",
    "BA-DISP-025": "CALCULATED",
    "BA-DISP-027": "CALCULATED",
    "BA-DISP-028": "CALCULATED",
    "BA-DISP-029": "CALCULATED"
  },
  "P9-NOLEAK-BODYMASS": {
    "BA-DISP-014": "CALCULATED",
    "BA-DISP-015": "CALCULATED",
    "BA-DISP-016": "CALCULATED",
    "BA-DISP-018": "CALCULATED",
    "BA-DISP-019": "CALCULATED",
    "BA-DISP-021": "CALCULATED",
    "BA-DISP-023": "CALCULATED",
    "BA-DISP-024": "CALCULATED",
    "BA-DISP-025": "CALCULATED",
    "BA-DISP-027": "CALCULATED",
    "BA-DISP-028": "CALCULATED",
    "BA-DISP-029": "CALCULATED"
  },
  "P9-NOLEAK-SURFACE-ORDINAL": {
    "BA-DISP-014": "CALCULATED",
    "BA-DISP-015": "CALCULATED",
    "BA-DISP-016": "CALCULATED",
    "BA-DISP-018": "CALCULATED",
    "BA-DISP-019": "CALCULATED",
    "BA-DISP-021": "CALCULATED",
    "BA-DISP-023": "CALCULATED",
    "BA-DISP-024": "CALCULATED",
    "BA-DISP-025": "CALCULATED",
    "BA-DISP-027": "CALCULATED",
    "BA-DISP-028": "CALCULATED",
    "BA-DISP-029": "CALCULATED"
  },
  "P9-SEGMENT-EQUIVALENCE": {
    "BA-DISP-014": "CALCULATED",
    "BA-DISP-015": "CALCULATED",
    "BA-DISP-016": "CALCULATED",
    "BA-DISP-018": "CALCULATED",
    "BA-DISP-019": "CALCULATED",
    "BA-DISP-021": "CALCULATED",
    "BA-DISP-023": "CALCULATED",
    "BA-DISP-024": "CALCULATED",
    "BA-DISP-025": "CALCULATED",
    "BA-DISP-027": "CALCULATED",
    "BA-DISP-028": "CALCULATED",
    "BA-DISP-029": "CALCULATED"
  },
  "P9-MISSING-EXPOSURE": {
    "BA-DISP-014": "NOT_CALCULABLE",
    "BA-DISP-015": "NOT_CALCULABLE",
    "BA-DISP-016": "NOT_CALCULABLE",
    "BA-DISP-018": "NOT_CALCULABLE",
    "BA-DISP-019": "NOT_CALCULABLE",
    "BA-DISP-021": "NOT_CALCULABLE",
    "BA-DISP-023": "NOT_CALCULABLE",
    "BA-DISP-024": "NOT_CALCULABLE",
    "BA-DISP-025": "NOT_CALCULABLE",
    "BA-DISP-027": "NOT_CALCULABLE",
    "BA-DISP-028": "NOT_CALCULABLE",
    "BA-DISP-029": "NOT_CALCULABLE"
  },
  "P9-UNKNOWN-SURFACE": {
    "BA-DISP-014": "CALCULATED",
    "BA-DISP-015": "CALCULATED",
    "BA-DISP-016": "CALCULATED",
    "BA-DISP-018": "CALCULATED",
    "BA-DISP-019": "CALCULATED",
    "BA-DISP-021": "CALCULATED",
    "BA-DISP-023": "CALCULATED",
    "BA-DISP-024": "CALCULATED",
    "BA-DISP-025": "CALCULATED",
    "BA-DISP-027": "PARTIALLY_CALCULATED",
    "BA-DISP-028": "CALCULATED",
    "BA-DISP-029": "PARTIALLY_CALCULATED"
  },
  "P9-OOR-SPEED-6MS": {
    "BA-DISP-014": "OUT_OF_SUPPORTED_RANGE",
    "BA-DISP-015": "OUT_OF_SUPPORTED_RANGE",
    "BA-DISP-016": "PARTIALLY_CALCULATED",
    "BA-DISP-018": "PARTIALLY_CALCULATED",
    "BA-DISP-019": "OUT_OF_SUPPORTED_RANGE",
    "BA-DISP-021": "OUT_OF_SUPPORTED_RANGE",
    "BA-DISP-023": "OUT_OF_SUPPORTED_RANGE",
    "BA-DISP-024": "PARTIALLY_CALCULATED",
    "BA-DISP-025": "OUT_OF_SUPPORTED_RANGE",
    "BA-DISP-027": "PARTIALLY_CALCULATED",
    "BA-DISP-028": "OUT_OF_SUPPORTED_RANGE",
    "BA-DISP-029": "PARTIALLY_CALCULATED"
  }
});
