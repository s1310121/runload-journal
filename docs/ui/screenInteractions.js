import { bindColumn } from "./interactions/columnInteractions.js";
import { bindConsultation } from "./interactions/consultationInteractions.js";
import { bindCourseEditor, bindCourseLibrary } from "./interactions/courseInteractions.js";
import { bindHistory } from "./interactions/historyInteractions.js";
import { bindNotebook } from "./interactions/notebookInteractions.js";
import { bindPersonalInput } from "./interactions/personalInputInteractions.js";
import { bindPlan } from "./interactions/planInteractions.js";
import { bindRecordInput } from "./interactions/recordInputInteractions.js";
import { bindSubjectiveInput } from "./interactions/subjectiveInputInteractions.js";
import { bindResult } from "./interactions/resultInteractions.js";
import { bindSettings } from "./interactions/settingsInteractions.js";

const SCREEN_INTERACTION_BINDERS = Object.freeze({
  "record-input": bindRecordInput,
  "course-library": bindCourseLibrary,
  "course-editor": bindCourseEditor,
  "subjective-input": bindSubjectiveInput,
  "personal-input": bindPersonalInput,
  result: bindResult,
  history: bindHistory,
  plan: bindPlan,
  consultation: bindConsultation,
  column: bindColumn,
  notebook: bindNotebook,
  settings: bindSettings,
});

export function bindScreenInteractions(context) {
  SCREEN_INTERACTION_BINDERS[context.screenName]?.(context);
}
