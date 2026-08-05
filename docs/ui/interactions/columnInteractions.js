export function bindColumn({ services, router, context }) {
  const articleId = context?.parameters?.get("articleId") || "";
  if (articleId) services.workflows.notebook.rememberReadArticle(articleId);

  const searchForm = document.getElementById("column-search-form");
  searchForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    router.navigateToScreen("column", Object.fromEntries(new FormData(searchForm).entries()));
  });
}
