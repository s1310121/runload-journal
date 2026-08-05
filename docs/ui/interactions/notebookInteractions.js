import { showFormMessages } from "./formUtilities.js";

function uniqueStrings(values = []) {
  return [...new Set(values.map(String).map((value) => value.trim()).filter(Boolean))];
}

function buildSeenMaterialSelection(services, data) {
  const date = String(data.get("date") || "");
  const existing = services.storage.notebook.loadState().pages.find((page) => page.date === date) || {};
  const hasSeenSelector = data.get("seenMaterialsAvailable") === "1";
  const selectedKeys = uniqueStrings(data.getAll("seenMaterials"));
  const allSelectedKeys = selectedKeys;

  if (!hasSeenSelector) {
    return {
      selectedMaterials: [...(existing.selectedMaterials || [])],
      readArticleIds: [...(existing.readArticleIds || [])],
      selectedSeenMaterialKey: existing.selectedSeenMaterialKey || "",
    };
  }

  const selectedMaterials = [...(existing.selectedMaterials || [])].filter((material) => material !== "record-summary");
  const readArticleIds = [];
  const selectionUpdate = {
    selectedMaterials,
    readArticleIds,
    selectedSeenMaterialKey: allSelectedKeys[0] || "",
  };

  allSelectedKeys.forEach((key) => {
    if (key.startsWith("result:")) {
      const recordId = key.slice("result:".length);
      if (recordId) {
        selectionUpdate.recordId = recordId;
        if (!selectedMaterials.includes("record-summary")) selectedMaterials.push("record-summary");
      }
    }
    if (key.startsWith("column:")) {
      const articleId = key.slice("column:".length);
      if (articleId && !readArticleIds.includes(articleId)) readArticleIds.push(articleId);
    }
  });
  return selectionUpdate;
}

export function bindNotebook({ services, router }) {
  const dayForm = document.getElementById("notebook-day-form");
  dayForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(dayForm);
    const result = services.workflows.notebook.saveDayPage({
      date: String(data.get("date") || ""),
      recordId: String(data.get("recordId") || ""),
      pageTitle: String(data.get("pageTitle") || ""),
      dailyComment: String(data.get("dailyComment") || ""),
      oneThingTheme: String(data.get("oneThingTheme") || ""),
      oneThingNote: String(data.get("oneThingNote") || ""),
      reviewReferenceDate: String(data.get("reviewReferenceDate") || ""),
      observationPromptState: String(data.get("observationPromptState") || ""),
      observationSourceDate: String(data.get("observationSourceDate") || ""),
      observationReviewNote: String(data.get("observationReviewNote") || ""),
      ...buildSeenMaterialSelection(services, data),
    });
    if (!result.ok) {
      showFormMessages(dayForm, ["日ページを保存できませんでした。端末の空き容量やブラウザーの保存許可を見直してください。"]);
      return;
    }
    router.navigateToScreen("notebook", { view: "day", date: String(data.get("date") || ""), status: "saved" });
  });

}
