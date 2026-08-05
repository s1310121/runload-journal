import {
  V27_COMMON_REGIONAL_GRADE_INPUT_MAX_PERCENT,
  V27_TOTAL_GRADE_DOMAIN_MAX_PERCENT,
} from "../../core/model/v27/v27Constants.js";

function activeRepresentativeGrades(course = {}) {
  if (String(course.gradeKnowledge || "UNKNOWN") !== "KNOWN_PROFILE") return [];
  return [
    Number(course.upPercent || 0) > 0
      ? Number(course.upGradePercent)
      : null,
    Number(course.downPercent || 0) > 0
      ? Number(course.downGradePercent)
      : null,
  ].filter((value) => Number.isFinite(value) && value > 0);
}

export function gradeDomainNotice(course = {}, targetLabel = "内容") {
  const maximum = Math.max(0, ...activeRepresentativeGrades(course));
  if (maximum > V27_TOTAL_GRADE_DOMAIN_MAX_PERCENT) {
    return `代表勾配が${V27_TOTAL_GRADE_DOMAIN_MAX_PERCENT}%を超えています。この区間は確認できる資料の範囲外のため、数値結果には使わず、入力した事実と「範囲外」の状態を保存します。この${targetLabel}を保存しますか？`;
  }
  if (maximum > V27_COMMON_REGIONAL_GRADE_INPUT_MAX_PERCENT + 1e-9) {
    return "代表勾配が、一部の部位について資料で比較できる範囲を超えています。結果では、確認できる範囲と「範囲外」を分けて表示します。この"
      + `${targetLabel}を保存しますか？`;
  }
  return "";
}

export function confirmGradeDomain(course = {}, targetLabel = "内容", confirmAction = window.confirm) {
  const notice = gradeDomainNotice(course, targetLabel);
  return !notice || confirmAction(notice);
}
