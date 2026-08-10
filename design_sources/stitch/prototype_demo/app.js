(function () {
  const data = window.PROTOTYPE_DATA;
  const modules = data.modules;
  const routes = data.routes;
  const flows = data.flows;
  const fallbackProfileImage = "https://lh3.googleusercontent.com/aida-public/AB6AXuANXY-bfWcrMRkFjZJYn_RM57OASChxQPyb7BtIO61krUF7T1E0OT8Tp9cIOgPi8ySTGFCKElWa__BE6cqBfVL7hhxIXgFWUtsKF-IT51fQ1A5O4hlE1O5_ZE7YIXbGDuYNgyX6_mnwERJAHQRKpWUkgVRTI1PbGE4ylK8HOATSvpxmPR2nHGUhbkhUccH3Trz7cH87fM_VZVYind9ONwBVuYkbQajdPs14E6rKCtf34ybmDxz_Y3lByP-5hr1IaW1IIQlizPuFG2xN";

  const moduleMap = new Map(modules.map((module) => [module.id, module]));
  const routeMap = new Map(routes.map((route) => [route.id, route]));
  const tabLabelMap = {
    journey: "Journey",
    "baby-data": "Analysis",
    record: "",
    wishes: "Wishes",
    "family-share": "Family"
  };
  const storageKeys = {
    wishesMuseumDraft: "prototype.wishesMuseumDraft",
    wishesMuseumCommitted: "prototype.wishesMuseumCommitted"
  };
  // #region debug-point A:report-helper
  const debugConfig = {
    url: window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost"
      ? "http://127.0.0.1:7777/event"
      : "",
    sessionId: "wishes-save-freeze",
    runId: "pre-fix"
  };
  function reportDebug(hypothesisId, location, msg, data) {
    if (!debugConfig.url) {
      return;
    }
    fetch(debugConfig.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: debugConfig.sessionId,
        runId: debugConfig.runId,
        hypothesisId,
        location,
        msg,
        data,
        ts: Date.now()
      })
    }).catch(() => {});
  }
  // #endregion
  const routesByModule = modules.reduce((acc, module) => {
    acc[module.id] = routes.filter((route) => route.module === module.id);
    return acc;
  }, {});

  const elements = {
    moduleNav: document.getElementById("module-nav"),
    flowList: document.getElementById("flow-list"),
    screenList: document.getElementById("screen-list"),
    currentModuleLabel: document.getElementById("current-module-label"),
    currentTitle: document.getElementById("current-title"),
    currentSummary: document.getElementById("current-summary"),
    sourceLink: document.getElementById("source-link"),
    imageLink: document.getElementById("image-link"),
    flowContext: document.getElementById("flow-context"),
    tabbar: document.getElementById("app-tabbar"),
    stepper: document.getElementById("stepper"),
    quickActions: document.getElementById("quick-actions"),
    frame: document.getElementById("screen-frame"),
    frameLoading: document.getElementById("frame-loading"),
    prevButton: document.getElementById("prev-screen"),
    nextButton: document.getElementById("next-screen"),
    resetRoute: document.getElementById("reset-route"),
    menuToggle: document.getElementById("menu-toggle"),
    drawerClose: document.getElementById("drawer-close"),
    drawerMask: document.getElementById("drawer-mask"),
    drawer: document.getElementById("demo-drawer")
  };

  function getRouteFileName(routeId) {
    return `${routeId}.html`;
  }

  function getInitialRouteId() {
    const bodyRouteId = document.body.dataset.routeId;
    if (bodyRouteId && routeMap.has(bodyRouteId)) {
      return bodyRouteId;
    }

    const fileName = window.location.pathname.split("/").pop() || "";
    const routeIdFromFile = fileName.replace(/\.html$/, "");
    if (routeMap.has(routeIdFromFile)) {
      return routeIdFromFile;
    }

    return "journey-home";
  }

  function getCurrentRoute() {
    return routeMap.get(getInitialRouteId());
  }

  function setRoute(routeId) {
    if (!routeMap.has(routeId)) {
      return;
    }
    // #region debug-point D:navigation
    reportDebug("D", "app.js:setRoute", "[DEBUG] setRoute called", {
      from: window.location.pathname.split("/").pop() || "",
      to: getRouteFileName(routeId)
    });
    // #endregion
    window.location.href = getRouteFileName(routeId);
  }

  function buildModuleButton(module, isActive) {
    return [
      `<button class="pill-button${isActive ? " active" : ""}" type="button" data-module-id="${module.id}">`,
      `<span class="material-symbols-outlined">${module.icon}</span>`,
      `<span>${module.label}</span>`,
      "</button>"
    ].join("");
  }

  function renderModuleButtons(currentModuleId) {
    elements.moduleNav.innerHTML = modules
      .map((module) => buildModuleButton(module, module.id === currentModuleId))
      .join("");

    elements.moduleNav.querySelectorAll("[data-module-id]").forEach((button) => {
      button.addEventListener("click", () => {
        const module = moduleMap.get(button.dataset.moduleId);
        setRoute(module.defaultRoute);
        closeDrawer();
      });
    });
  }

  function renderTabbar(currentModuleId) {
    elements.tabbar.innerHTML = modules
      .map((module) => {
        const classNames = ["tab-button"];
        if (module.primary) {
          classNames.push("record-tab");
        }
        if (module.id === currentModuleId) {
          classNames.push("active");
        }
        return [
          `<button class="${classNames.join(" ")}" type="button" data-module-tab="${module.id}">`,
          `<span class="material-symbols-outlined">${module.icon}</span>`,
          `<span class="tab-button-label">${tabLabelMap[module.id] || module.shortLabel}</span>`,
          "</button>"
        ].join("");
      })
      .join("");

    elements.tabbar.querySelectorAll("[data-module-tab]").forEach((button) => {
      button.addEventListener("click", () => {
        const module = moduleMap.get(button.dataset.moduleTab);
        setRoute(module.defaultRoute);
      });
    });
  }

  function renderFlows(currentRouteId) {
    elements.flowList.innerHTML = flows
      .map((flow) => {
        const active = flow.steps.includes(currentRouteId);
        return [
          `<button class="flow-button${active ? " active" : ""}" type="button" data-flow-id="${flow.id}">`,
          `<span class="flow-title">${flow.label}</span>`,
          `<span class="flow-copy">${flow.description}</span>`,
          "</button>"
        ].join("");
      })
      .join("");

    elements.flowList.querySelectorAll("[data-flow-id]").forEach((button) => {
      button.addEventListener("click", () => {
        const flow = flows.find((item) => item.id === button.dataset.flowId);
        if (flow) {
          setRoute(flow.steps[0]);
          closeDrawer();
        }
      });
    });
  }

  function renderScreenList(currentModuleId, currentRouteId) {
    const grouped = routesByModule[currentModuleId].reduce((acc, route) => {
      acc[route.group] = acc[route.group] || [];
      acc[route.group].push(route);
      return acc;
    }, {});

    elements.screenList.innerHTML = Object.entries(grouped)
      .map(([group, groupRoutes]) => {
        const items = groupRoutes
          .map((route) => {
            return [
              `<button class="screen-button${route.id === currentRouteId ? " active" : ""}" type="button" data-route-id="${route.id}">`,
              `<span class="screen-title">${route.title}</span>`,
              `<span class="screen-copy">${route.summary}</span>`,
              "</button>"
            ].join("");
          })
          .join("");
        return `<div class="screen-group"><div class="group-title">${group}</div>${items}</div>`;
      })
      .join("");

    elements.screenList.querySelectorAll("[data-route-id]").forEach((button) => {
      button.addEventListener("click", () => {
        setRoute(button.dataset.routeId);
        closeDrawer();
      });
    });
  }

  function getFlowForRoute(routeId) {
    return flows.find((flow) => flow.steps.includes(routeId)) || null;
  }

  function renderFlowContext(routeId) {
    const flow = getFlowForRoute(routeId);
    if (!flow) {
      elements.flowContext.innerHTML = [
        '<span class="meta-label">当前流程</span>',
        '<span class="flow-context-copy">该页面当前未归入推荐流程，可通过左侧页面列表自由跳转。</span>'
      ].join("");
      return;
    }

    const index = flow.steps.indexOf(routeId) + 1;
    elements.flowContext.innerHTML = [
      '<span class="meta-label">当前流程</span>',
      `<span class="flow-context-title">${flow.label}</span>`,
      `<span class="flow-context-copy">第 ${index} / ${flow.steps.length} 步 · ${flow.description}</span>`
    ].join("");
  }

  function renderStepper(routeId) {
    const flow = getFlowForRoute(routeId);
    if (!flow) {
      elements.stepper.innerHTML = '<div class="section-subtle">当前页面没有绑定推荐流程，建议从左侧流程卡片开始演示。</div>';
      return;
    }

    elements.stepper.innerHTML = flow.steps
      .map((stepId, index) => {
        const stepRoute = routeMap.get(stepId);
        return [
          `<button class="step-button${stepId === routeId ? " active" : ""}" type="button" data-step-id="${stepId}">`,
          `<span class="step-title">${index + 1}. ${stepRoute.title}</span>`,
          `<span class="step-copy">${stepRoute.summary}</span>`,
          "</button>"
        ].join("");
      })
      .join("");

    elements.stepper.querySelectorAll("[data-step-id]").forEach((button) => {
      button.addEventListener("click", () => {
        setRoute(button.dataset.stepId);
        closeDrawer();
      });
    });
  }

  function renderQuickActions(route) {
    const relatedIds = route.actions || [];
    if (!relatedIds.length) {
      elements.quickActions.innerHTML = '<div class="section-subtle">当前页面没有额外推荐跳转。</div>';
      return;
    }

    elements.quickActions.innerHTML = relatedIds
      .map((routeId) => {
        const target = routeMap.get(routeId);
        return [
          `<button class="action-chip" type="button" data-action-route="${target.id}">`,
          '<span class="material-symbols-outlined">arrow_outward</span>',
          `<span>${target.title}</span>`,
          "</button>"
        ].join("");
      })
      .join("");

    elements.quickActions.querySelectorAll("[data-action-route]").forEach((button) => {
      button.addEventListener("click", () => {
        setRoute(button.dataset.actionRoute);
        closeDrawer();
      });
    });
  }

  function loadFrame(route) {
    elements.frameLoading.classList.remove("hidden");
    if (window.location.protocol === "file:" && window.PROTOTYPE_INLINE_HTML && window.PROTOTYPE_INLINE_HTML[route.id]) {
      elements.frame.removeAttribute("src");
      elements.frame.srcdoc = buildInlineRouteHtml(route, window.PROTOTYPE_INLINE_HTML[route.id]);
    } else {
      elements.frame.removeAttribute("srcdoc");
      elements.frame.src = route.src;
    }
    elements.sourceLink.href = route.src;
    elements.imageLink.href = route.image;
  }

  function buildInlineRouteHtml(route, html) {
    const absoluteSrcUrl = new URL(route.src, window.location.href).href;
    const baseTag = `<base href="${absoluteSrcUrl}">`;

    if (/<head[^>]*>/i.test(html)) {
      return html.replace(/<head([^>]*)>/i, `<head$1>${baseTag}`);
    }

    return `<!DOCTYPE html><html><head>${baseTag}</head><body>${html}</body></html>`;
  }

  function enhanceIframe(route) {
    const doc = elements.frame.contentDocument;
    if (!doc) {
      return;
    }
    // #region debug-point B:enhance-entry
    reportDebug("B", "app.js:enhanceIframe", "[DEBUG] enhanceIframe entry", {
      routeId: route.id,
      src: route.src
    });
    // #endregion

    const styleId = "prototype-demo-style";
    let style = doc.getElementById(styleId);
    if (!style) {
      style = doc.createElement("style");
      style.id = styleId;
      doc.head.appendChild(style);
    }

    style.textContent = `
      nav[data-prototype-hidden="true"],
      footer[data-prototype-hidden="true"],
      div[data-prototype-hidden="true"],
      section[data-prototype-hidden="true"] { display: none !important; }
      body { padding-bottom: 110px !important; }
      html, body { overscroll-behavior: contain; }
    `;

    doc.querySelectorAll("nav, footer, div, section").forEach((element) => {
      if (isBottomNavigationContainer(element)) {
        element.setAttribute("data-prototype-hidden", "true");
      }
    });

    ensureProfileImages(doc);
    hideAnalysisHeaderMoreButton(doc, route.id);
    enhanceAnalysisTabs(doc, route.id);

    const moreLinks = Array.from(doc.querySelectorAll("a, button")).filter((node) => {
      const label = (node.textContent || "").trim();
      return label === "More";
    });

    if (route.id === "journey-home" && moreLinks.length >= 3) {
      bindFrameJump(moreLinks[0], "journey-weekly-insight");
      bindFrameJump(moreLinks[1], "journey-milestones");
      bindFrameJump(moreLinks[2], "journey-list");
    }

    if (route.id === "journey-home") {
      const profileTrigger = doc.querySelector("header > div > div:first-child");
      const calendarIcon = findNodeByText(doc, "span.material-symbols-outlined", "calendar_month");
      const calendarButton = calendarIcon ? calendarIcon.closest("button") : doc.querySelector("header button");
      const vaccineHeading = findNodeByText(doc, "h3, p, div, section", "Upcoming: 6-Month Vaccination");
      const vaccineCard = vaccineHeading ? vaccineHeading.closest("section") : null;
      bindFrameJump(profileTrigger, "baby-profile-view");
      bindFrameJump(calendarButton, "journey-calendar");
      bindFrameJump(vaccineCard, "journey-vaccine");
    }

    if (route.id === "journey-vaccine") {
      const backButton = doc.querySelector("header button") || findBackButton(doc);
      bindBackTarget(backButton, "journey-home");
    }

    if (route.id === "journey-weekly-insight") {
      const backButton = doc.querySelector("header button") || findBackButton(doc);
      bindBackTarget(backButton, "journey-home");
    }

    if (route.id === "wishes-swim") {
      const backButton = doc.querySelector("header button") || findBackButton(doc);
      bindBackTarget(backButton, "wishes-list");
    }

    if (route.id === "wishes-museum") {
      const editListButton = findNodeByText(doc, "button, a, div, span", "Edit List");
      bindFrameJump(editListButton ? editListButton.closest("button") || editListButton : null, "wishes-museum-edit");
      renderPersistedMuseumItems(doc);
      bindMuseumChecklistSaveFlow(doc);
    }

    if (route.id === "baby-profile-view") {
      const avatarEditButton = findNodeByText(doc, "button, a, div, span", "edit");
      const editAllButton = findNodeByText(doc, "button, a, div, span", "Edit All");
      const headerButtons = Array.from(doc.querySelectorAll("header button"));
      const moreButton = headerButtons[1] || findNodeByText(doc, "button, a, div, span", "more_vert");

      bindFrameJump(avatarEditButton ? avatarEditButton.closest("button") || avatarEditButton : null, "baby-profile-photo");
      bindFrameJump(editAllButton ? editAllButton.closest("button") || editAllButton : null, "baby-profile-preferences");
      bindProfileMoreMenu(doc, moreButton ? moreButton.closest("button") || moreButton : null);
    }

    if (route.id === "baby-profile-preferences") {
      const saveButton = findNodeByText(doc, "button, a, div, span", "Save Changes");
      bindFrameJump(saveButton ? saveButton.closest("button") || saveButton : null, "baby-profile-view");
    }

    if (route.id === "data-growth") {
      const sleepTab = findNodeByText(doc, "button, a, div, span", "Sleep");
      const dietTab = findNodeByText(doc, "button, a, div, span", "Diet");
      const moodTab = findNodeByText(doc, "button, a, div, span", "Mood");
      bindFrameJump(sleepTab ? sleepTab.closest("button") || sleepTab : null, "data-sleep-day");
      bindFrameJump(dietTab ? dietTab.closest("button") || dietTab : null, "data-diet-week");
      bindFrameJump(moodTab ? moodTab.closest("button") || moodTab : null, "data-mood");
    }

    if (route.id === "record-center") {
      bindRecordCenterWorkflow(doc);
    }

    if (route.id === "journey-milestones") {
      const moreButton = findNodeByText(doc, "button, a, div, span", "more");
      bindMilestoneMore(moreButton ? moreButton.closest("button") || moreButton : null, doc);
    }

    if (route.id === "journey-list") {
      const backButton = doc.querySelector("header button") || findBackButton(doc);
      bindBackTarget(backButton, "journey-home");
      bindByKeyword(doc, "milestone", "journey-milestones");
    }

    if (route.id === "wishes-list") {
      const profileTrigger = doc.querySelector("header > div > div.cursor-pointer") || doc.querySelector("header img");
      const moreButton = doc.querySelector("header button");
      const swimCard = findArticleByHeading(doc, "Learn to Swim");
      const museumCard = findArticleByHeading(doc, "Visit 10 Museums");
      const booksCard = findArticleByHeading(doc, "100 Books Before K");
      reorderWishesCards(doc, [museumCard, booksCard, swimCard]);
      bindFrameJump(profileTrigger ? profileTrigger.closest("button, a, div") || profileTrigger : null, "baby-profile-view");
      bindFrameJump(swimCard, "wishes-swim");
      bindFrameJump(museumCard, "wishes-museum");
      bindFrameJump(booksCard, "wishes-number");
      if (moreButton) {
        moreButton.style.display = "none";
      }
    }

    if (route.id === "family-home") {
      const inviteButton = findNodeByText(doc, "button, a, div, span", "Invite");
      const profileTrigger = doc.querySelector("header .w-10.h-10.rounded-full") || doc.querySelector("header img");
      const searchHeading = findNodeByText(doc, "button, a, div, span", "What to Share?");
      const searchHeadingParent = searchHeading ? searchHeading.parentElement : null;
      const searchButton = searchHeadingParent ? searchHeadingParent.querySelector("button") : null;
      const longImageButton = findNodeByText(doc, "button, a, div, span", "Long Image");
      const memberMenuButtons = Array.from(doc.querySelectorAll("button[aria-label='Member settings'], button"))
        .filter((button) => {
          const iconNode = button.querySelector(".material-symbols-outlined");
          const iconText = iconNode && typeof iconNode.textContent === "string" ? iconNode.textContent.trim() : "";
          return iconText === "more_vert";
        });
      bindFrameJump(profileTrigger ? profileTrigger.closest("button, a, div") || profileTrigger : null, "baby-profile-view");
      bindFrameJump(inviteButton ? inviteButton.closest("button") || inviteButton : null, "family-invite");
      bindFrameJump(searchButton ? searchButton.closest("button") || searchButton : null, "family-search-results");
      bindFrameJump(longImageButton ? longImageButton.closest("button") || longImageButton : null, "family-poster");
      memberMenuButtons.forEach((button) => bindFrameJump(button, "family-members"));
    }

    if (route.id === "data-sleep-day") {
      const growthTab = findNodeByText(doc, "button, a, div, span", "Growth");
      const dietTab = findNodeByText(doc, "button, a, div, span", "Diet");
      const moodTab = findNodeByText(doc, "button, a, div, span", "Mood");
      const monthlyTab = findNodeByText(doc, "button, a, div, span", "Monthly Evolution");
      const ringHeading = findNodeByText(doc, "h3, p, div, span", "Today's Circadian Ring");
      const polarGuideLabel = findNodeByText(doc, "span, p, div", "Polar Guide");
      if (ringHeading) {
        ringHeading.textContent = "Today's Circadian Ring";
        ringHeading.style.fontSize = "11px";
        ringHeading.style.letterSpacing = "0.06em";
        ringHeading.style.whiteSpace = "nowrap";
      }
      if (polarGuideLabel) {
        polarGuideLabel.textContent = "Guide";
      }
      bindFrameJump(growthTab ? growthTab.closest("button") || growthTab : null, "data-growth");
      bindFrameJump(dietTab ? dietTab.closest("button") || dietTab : null, "data-diet-week");
      bindFrameJump(moodTab ? moodTab.closest("button") || moodTab : null, "data-mood");
      bindFrameJump(monthlyTab ? monthlyTab.closest("button") || monthlyTab : null, "data-sleep-month");
    }

    if (route.id === "data-sleep-month") {
      const dailyTab = findNodeByText(doc, "button, a, div, span", "Daily Ring");
      const dietTab = findNodeByText(doc, "button, a, div, span", "Diet");
      const moodTab = findNodeByText(doc, "button, a, div, span", "Mood");
      bindFrameJump(dailyTab ? dailyTab.closest("button") || dailyTab : null, "data-sleep-day");
      bindFrameJump(dietTab ? dietTab.closest("button") || dietTab : null, "data-diet-week");
      bindFrameJump(moodTab ? moodTab.closest("button") || moodTab : null, "data-mood");
    }

    if (route.id === "data-diet-week") {
      const growthTab = findNodeByText(doc, "button, a, div, span", "Growth");
      const sleepTab = findNodeByText(doc, "button, a, div, span", "Sleep");
      const moodTab = findNodeByText(doc, "button, a, div, span", "Mood");
      const monthDietTab = findNodeByText(doc, "button, a, div, span", "本月膳食");
      bindFrameJump(growthTab ? growthTab.closest("button") || growthTab : null, "data-growth");
      bindFrameJump(sleepTab ? sleepTab.closest("button") || sleepTab : null, "data-sleep-day");
      bindFrameJump(moodTab ? moodTab.closest("button") || moodTab : null, "data-mood");
      bindFrameJump(monthDietTab ? monthDietTab.closest("button") || monthDietTab : null, "data-diet-month");
    }

    if (route.id === "data-diet-month") {
      const growthTab = findNodeByText(doc, "button, a, div, span", "Growth");
      const sleepTab = findNodeByText(doc, "button, a, div, span", "Sleep");
      const moodTab = findNodeByText(doc, "button, a, div, span", "Mood");
      const weekDietTab = findNodeByText(doc, "button, a, div, span", "本周奶量");
      bindFrameJump(growthTab ? growthTab.closest("button") || growthTab : null, "data-growth");
      bindFrameJump(sleepTab ? sleepTab.closest("button") || sleepTab : null, "data-sleep-day");
      bindFrameJump(moodTab ? moodTab.closest("button") || moodTab : null, "data-mood");
      bindFrameJump(weekDietTab ? weekDietTab.closest("button") || weekDietTab : null, "data-diet-week");
    }

    if (route.id === "data-mood") {
      const growthTab = findNodeByText(doc, "button, a, div, span", "Growth");
      const sleepTab = findNodeByText(doc, "button, a, div, span", "Sleep");
      const dietTab = findNodeByText(doc, "button, a, div, span", "Diet");
      bindFrameJump(growthTab ? growthTab.closest("button") || growthTab : null, "data-growth");
      bindFrameJump(sleepTab ? sleepTab.closest("button") || sleepTab : null, "data-sleep-day");
      bindFrameJump(dietTab ? dietTab.closest("button") || dietTab : null, "data-diet-week");
    }

    if (route.id === "wishes-swim") {
      const editListButton = findNodeByText(doc, "button, a, div, span", "Edit List");
      const editButton = editListButton ? editListButton.closest("button") || editListButton : null;
      if (editButton) {
        editButton.replaceWith(editButton.cloneNode(true));
      }
    }

    if (route.id === "wishes-number") {
      bindNumberSaveWorkflow(doc);
    }

    if (route.id === "wishes-museum-edit") {
      bindMuseumEditWorkflow(doc);
    }

    if (route.id === "family-search-results") {
      moveElementIntoScrollFlow(doc, {
        selector: "body > div.fixed.bottom-6",
        targetSelector: "main",
        className: "prototype-inline-action-bar"
      });
      bindFamilySearchResultsInteractions(doc);
      const posterButton = findNodeByText(doc, "button, a, div, span", "Poster");
      bindFrameJump(posterButton ? posterButton.closest("button") || posterButton : null, "family-poster");
    }

    if (route.id === "family-members") {
      bindFamilyMembersWorkflow(doc);
    }

    if (route.id === "family-filter") {
      bindFamilyFilterWorkflow(doc);
    }

    if (route.id === "family-filtered-results") {
      bindFamilyFilteredResultsWorkflow(doc);
    }

    if (route.id === "family-invite") {
      moveElementIntoScrollFlow(doc, {
        selector: "footer.fixed.bottom-0",
        targetSelector: "main",
        className: "prototype-inline-footer-actions"
      });
      const cancelButton = findButtonByExactText(doc, "取消");
      const inviteSubmitButton = Array.from(doc.querySelectorAll("button")).find((button) => {
        const normalized = (button.textContent || "").replace(/\s+/g, "");
        const hasArrow = Boolean(button.querySelector("[data-icon='arrow_forward'], .material-symbols-outlined"));
        return normalized.includes("邀请") && hasArrow;
      }) || null;
      bindFrameJump(cancelButton, "family-home");
      bindFrameJump(inviteSubmitButton, "family-invite-token");
    }

    if (route.id === "family-invite-token") {
      const backButton = doc.querySelector("header button") || findBackButton(doc);
      bindBackTarget(backButton, "family-invite");
    }

    unifyProfileHeaderVisuals(doc, route.id);

    bindFrameBackActions(doc, route);
  }

  function bindFrameJump(node, routeId) {
    if (!node || node.dataset.prototypeBound === "true") {
      return;
    }
    node.dataset.prototypeBound = "true";
    node.style.cursor = "pointer";
    if (typeof node.removeAttribute === "function") {
      node.removeAttribute("href");
      node.removeAttribute("onclick");
    }
    try {
      node.onclick = null;
    } catch (_error) {
      // Ignore nodes that expose readonly onclick.
    }
    node.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      setRoute(routeId);
    });
  }

  function bindByKeyword(doc, keyword, routeId) {
    const matched = Array.from(doc.querySelectorAll("a, button, div, span")).find((node) => {
      const text = (node.textContent || "").trim().toLowerCase();
      return text.includes(keyword);
    });
    bindFrameJump(matched, routeId);
  }

  function findButtonByExactText(doc, expectedText) {
    return Array.from(doc.querySelectorAll("button")).find((button) => {
      const text = (button.textContent || "").replace(/\s+/g, " ").trim();
      return text === expectedText;
    }) || null;
  }

  function findButtonByIncludedText(doc, expectedText) {
    return Array.from(doc.querySelectorAll("button")).find((button) => {
      const text = (button.textContent || "").replace(/\s+/g, " ").trim();
      return text.includes(expectedText);
    }) || null;
  }

  function bindRecordCenterWorkflow(doc) {
    const textArea = doc.querySelector("textarea");
    const inputSection = doc.getElementById("input-section");
    const loadingSection = doc.getElementById("loading-section");
    const resultSection = doc.getElementById("result-section");
    const closeButtonNode = findNodeByText(doc, "button span, span", "close");
    const closeButton = closeButtonNode ? closeButtonNode.closest("button") : null;
    const analyzeButton = findButtonByExactText(doc, "Analyze & Save");
    const confirmButton = findButtonByExactText(doc, "Confirm & Save to Timeline");

    if (textArea && textArea.dataset.prototypeRecordInputBound !== "true") {
      textArea.dataset.prototypeRecordInputBound = "true";
      textArea.addEventListener("click", (event) => {
        event.stopPropagation();
      });
      textArea.addEventListener("focus", (event) => {
        event.stopPropagation();
      });
    }

    if (analyzeButton && analyzeButton.dataset.prototypeRecordAnalyzeBound !== "true") {
      analyzeButton.dataset.prototypeRecordAnalyzeBound = "true";
      analyzeButton.removeAttribute("onclick");
      analyzeButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (inputSection) {
          inputSection.classList.add("hidden");
          inputSection.classList.remove("block");
        }
        if (loadingSection) {
          loadingSection.classList.remove("hidden");
          loadingSection.classList.add("block");
        }
        if (resultSection) {
          resultSection.classList.remove("block");
          resultSection.classList.add("hidden");
        }

        window.setTimeout(() => {
          setRoute("record-photo-text");
        }, 900);
      });
    }

    if (closeButton && closeButton.dataset.prototypeRecordCloseBound !== "true") {
      closeButton.dataset.prototypeRecordCloseBound = "true";
      closeButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        setRoute("journey-home");
      });
    }

    if (confirmButton && confirmButton.dataset.prototypeRecordConfirmBound !== "true") {
      confirmButton.dataset.prototypeRecordConfirmBound = "true";
      confirmButton.style.cursor = "pointer";
      confirmButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        setRoute("journey-list");
      });
    }

    if (resultSection && resultSection.dataset.prototypeRecordResultBound !== "true") {
      resultSection.dataset.prototypeRecordResultBound = "true";
      resultSection.addEventListener("click", (event) => {
        const targetButton = event.target.closest("button");
        if (!targetButton) {
          return;
        }
        const text = (targetButton.textContent || "").replace(/\s+/g, " ").trim();
        if (text !== "Confirm & Save to Timeline") {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        setRoute("journey-list");
      }, true);
    }
  }

  function bindFamilyMembersWorkflow(doc) {
    const confirmButton = findButtonByExactText(doc, "确认更改");
    const removeButton = findButtonByIncludedText(doc, "移出该家庭空间");
    const sheet = doc.querySelector("[data-purpose='permission-settings-sheet']") || null;

    if (confirmButton && confirmButton.dataset.prototypeFamilyMembersConfirmBound !== "true") {
      confirmButton.dataset.prototypeFamilyMembersConfirmBound = "true";
      confirmButton.style.cursor = "pointer";
      confirmButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        setRoute("family-home");
      });
    }

    if (removeButton && removeButton.dataset.prototypeFamilyMembersRemoveBound !== "true") {
      removeButton.dataset.prototypeFamilyMembersRemoveBound = "true";
      removeButton.style.cursor = "pointer";
      removeButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        setRoute("family-home");
      });
    }

    if (sheet && sheet.dataset.prototypeFamilyMembersSheetBound !== "true") {
      sheet.dataset.prototypeFamilyMembersSheetBound = "true";
      sheet.addEventListener("click", (event) => {
        const targetButton = event.target.closest("button");
        if (!targetButton) {
          return;
        }
        const text = (targetButton.textContent || "").replace(/\s+/g, " ").trim();
        if (text === "确认更改" || text.includes("移出该家庭空间")) {
          event.preventDefault();
          event.stopPropagation();
          setRoute("family-home");
        }
      }, true);
    }
  }

  function bindFamilyFilterWorkflow(doc) {
    const applyButton = findButtonByExactText(doc, "Apply Filter");
    const cancelButton = findButtonByExactText(doc, "Cancel");
    const panel = doc.getElementById("filter-top-panel") || null;
    const avatarImage = doc.querySelector("header img[alt='Baby profile photo']");
    const avatar = avatarImage ? avatarImage.closest("div") : null;
    const headerTitle = doc.querySelector("header h1");
    const filterIconNode = findNodeByText(doc, "header button span, header span", "filter_list");
    const filterButton = filterIconNode ? filterIconNode.closest("button") : null;
    const ageBadge = Array.from(doc.querySelectorAll("header span")).find((node) => {
      const text = (node.textContent || "").replace(/\s+/g, " ").trim();
      return text === "6M";
    }) || null;

    if (avatar) {
      avatar.remove();
    }

    if (ageBadge) {
      ageBadge.remove();
    }

    if (headerTitle) {
      headerTitle.textContent = "Memories";
    }

    enhanceFamilyFilterSelections(doc);

    if (filterButton) {
      filterButton.removeAttribute("onclick");
      bindFrameJump(filterButton, "family-search-results");
    }

    if (applyButton && applyButton.dataset.prototypeFamilyFilterApplyBound !== "true") {
      applyButton.dataset.prototypeFamilyFilterApplyBound = "true";
      applyButton.style.cursor = "pointer";
      applyButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        setRoute("family-filtered-results");
      });
    }

    if (cancelButton && cancelButton.dataset.prototypeFamilyFilterCancelBound !== "true") {
      cancelButton.dataset.prototypeFamilyFilterCancelBound = "true";
      cancelButton.style.cursor = "pointer";
      cancelButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        setRoute("family-search-results");
      });
    }

    if (panel && panel.dataset.prototypeFamilyFilterPanelBound !== "true") {
      panel.dataset.prototypeFamilyFilterPanelBound = "true";
      panel.addEventListener("click", (event) => {
        const targetButton = event.target.closest("button");
        if (!targetButton) {
          return;
        }
        const text = (targetButton.textContent || "").replace(/\s+/g, " ").trim();
        if (text === "Apply Filter") {
          event.preventDefault();
          event.stopPropagation();
          setRoute("family-filtered-results");
          return;
        }
        if (text === "Cancel") {
          event.preventDefault();
          event.stopPropagation();
          setRoute("family-search-results");
        }
      }, true);
    }
  }

  function bindFamilyFilteredResultsWorkflow(doc) {
    const actionDock = doc.getElementById("action-dock") || null;
    const filteredResultsFilterIcon = findNodeByText(doc, "header button span, header span", "filter_list");
    const filterButton = filteredResultsFilterIcon ? filteredResultsFilterIcon.closest("button") : null;
    const linkButton = Array.from(doc.querySelectorAll("button")).find((button) => {
      const normalized = (button.textContent || "").replace(/\s+/g, "").toLowerCase();
      return normalized.includes("link");
    }) || null;
    const posterButton = Array.from(doc.querySelectorAll("button")).find((button) => {
      const normalized = (button.textContent || "").replace(/\s+/g, "").toLowerCase();
      return normalized.includes("poster");
    }) || null;
    const filteredResultsAvatarImage = doc.querySelector("header img[alt='Baby profile photo'], header img[alt='Profile']");
    const avatar = filteredResultsAvatarImage ? filteredResultsAvatarImage.closest("div") : null;
    const headerTitle = doc.querySelector("header h1") || null;

    if (avatar) {
      avatar.remove();
    }

    if (headerTitle) {
      headerTitle.textContent = "Memories";
    }

    if (filterButton) {
      bindFrameJump(filterButton, "family-filter");
    }

    [linkButton, posterButton].forEach((button) => {
      if (!button) {
        return;
      }
      bindFrameJump(button, "family-poster");
    });

    if (actionDock && actionDock.dataset.prototypeFamilyFilteredDockBound !== "true") {
      actionDock.dataset.prototypeFamilyFilteredDockBound = "true";
      actionDock.addEventListener("click", (event) => {
        const targetButton = event.target.closest("button");
        if (!targetButton) {
          return;
        }
        const normalized = (targetButton.textContent || "").replace(/\s+/g, "").toLowerCase();
        if (!normalized.includes("link") && !normalized.includes("poster")) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        setRoute("family-poster");
      }, true);
    }
  }

  function enhanceFamilyFilterSelections(doc) {
    const panel = doc.getElementById("filter-top-panel");
    if (!panel) {
      return;
    }

    const groupConfigs = [
      { texts: ["All Time", "Last 7 Days", "This Month"], multi: false },
      { texts: ["Milestone", "Diet", "Smiles", "Outdoor"], multi: true },
      { texts: ["Media", "Text"], multi: true }
    ];

    const interactiveControls = Array.from(panel.querySelectorAll("button, label")).filter((node) => {
      const text = getFilterControlLabel(node);
      return groupConfigs.some((group) => group.texts.includes(text));
    });

    const buttonMap = new Map();
    interactiveControls.forEach((control) => {
      const text = getFilterControlLabel(control);
      buttonMap.set(text, control);
      styleFilterButton(control, isFilterButtonActive(control));
    });

    groupConfigs.forEach((group) => {
      group.texts.forEach((text) => {
        const control = buttonMap.get(text);
        if (!control || control.dataset.prototypeFilterToggleBound === "true") {
          return;
        }
        control.dataset.prototypeFilterToggleBound = "true";
        control.style.cursor = "pointer";
        control.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();

          if (!group.multi) {
            group.texts.forEach((otherText) => {
              const otherControl = buttonMap.get(otherText);
              if (otherControl) {
                setFilterButtonActive(otherControl, otherControl === control);
              }
            });
            return;
          }

          setFilterButtonActive(control, !isFilterButtonActive(control));
        });
      });
    });
  }

  function getFilterControlLabel(node) {
    const clone = node.cloneNode(true);
    Array.from(clone.querySelectorAll(".material-symbols-outlined, input")).forEach((child) => child.remove());
    return (clone.textContent || "").replace(/\s+/g, " ").trim();
  }

  function getFilterControlSurface(node) {
    return node.tagName === "LABEL" ? node.querySelector("div") || node : node;
  }

  function isFilterButtonActive(control) {
    const input = control.querySelector("input");
    const surface = getFilterControlSurface(control);
    return control.dataset.prototypeSelected === "true"
      || (input ? input.checked : false)
      || surface.classList.contains("bg-primary")
      || surface.classList.contains("bg-primary-container");
  }

  function setFilterButtonActive(control, active) {
    control.dataset.prototypeSelected = active ? "true" : "false";
    const input = control.querySelector("input");
    if (input) {
      input.checked = active;
    }
    styleFilterButton(control, active);
  }

  function styleFilterButton(control, active) {
    const surface = getFilterControlSurface(control);
    const isMediaType = control.tagName === "LABEL";
    surface.classList.remove("bg-primary", "text-on-primary", "bg-primary-container", "text-on-primary-container", "bg-surface-container", "text-on-surface-variant");

    if (active) {
      if (isMediaType) {
        surface.classList.add("bg-primary-container", "text-on-primary-container");
      } else {
        surface.classList.add("bg-primary", "text-on-primary");
      }
      return;
    }

    surface.classList.add("bg-surface-container", "text-on-surface-variant");
  }

  function bindFamilySearchResultsInteractions(doc) {
    const filterIcon = findNodeByText(doc, "button span, span", "filter_list");
    const filterButton = filterIcon ? filterIcon.closest("button") : null;
    const searchResultsAvatarImage = doc.querySelector("header img[alt='Profile']");
    const avatar = searchResultsAvatarImage ? searchResultsAvatarImage.closest("div") : null;

    bindFrameJump(filterButton, "family-filter");

    if (avatar) {
      avatar.remove();
    }
  }

  function findNodeByText(doc, selector, expectedText) {
    return Array.from(doc.querySelectorAll(selector)).find((node) => {
      const text = (node.textContent || "").replace(/\s+/g, " ").trim();
      return text.includes(expectedText);
    }) || null;
  }

  function findArticleByHeading(doc, expectedText) {
    const heading = Array.from(doc.querySelectorAll("article h1, article h2, article h3, article h4")).find((node) => {
      const text = (node.textContent || "").replace(/\s+/g, " ").trim();
      return text === expectedText;
    });
    return heading ? heading.closest("article") : null;
  }

  function enhanceAnalysisTabs(doc, routeId) {
    const activeLabelByRoute = {
      "data-growth": "Growth",
      "data-sleep-day": "Sleep",
      "data-sleep-month": "Sleep",
      "data-diet-week": "Diet",
      "data-diet-month": "Diet",
      "data-mood": "Mood"
    };
    const routeByLabel = {
      Growth: "data-growth",
      Sleep: "data-sleep-day",
      Diet: "data-diet-week",
      Mood: "data-mood"
    };
    const iconByLabel = {
      Growth: "trending_up",
      Sleep: "bedtime",
      Diet: "restaurant",
      Mood: "mood"
    };
    const orderedLabels = ["Growth", "Sleep", "Diet", "Mood"];
    const activeLabel = activeLabelByRoute[routeId];

    if (!activeLabel) {
      return;
    }

    const nav = Array.from(doc.querySelectorAll("nav")).find((candidate) => {
      const buttonTexts = Array.from(candidate.querySelectorAll("button")).map((button) => {
        return (button.textContent || "").replace(/\s+/g, " ").trim();
      });
      return orderedLabels.every((label) => buttonTexts.some((text) => text.includes(label)));
    }) || null;

    if (!nav) {
      return;
    }

    const buttonByLabel = new Map();
    Array.from(nav.querySelectorAll("button")).forEach((button) => {
      const text = (button.textContent || "").replace(/\s+/g, " ").trim();
      const label = orderedLabels.find((item) => text.includes(item));
      if (label && !buttonByLabel.has(label)) {
        buttonByLabel.set(label, button);
      }
    });

    if (buttonByLabel.size !== orderedLabels.length) {
      return;
    }

    let wrapper = doc.querySelector("[data-prototype-analysis-tabs-wrapper='true']");
    if (!wrapper) {
      wrapper = doc.createElement("div");
      wrapper.setAttribute("data-prototype-analysis-tabs-wrapper", "true");
    }

    if (!wrapper.isConnected) {
      const header = doc.querySelector("header");
      const main = doc.querySelector("main");
      if (header && header.parentElement) {
        header.insertAdjacentElement("afterend", wrapper);
      } else if (main && main.parentElement) {
        main.parentElement.insertBefore(wrapper, main);
      } else {
        doc.body.insertBefore(wrapper, doc.body.firstChild);
      }
    }

    if (nav.parentElement !== wrapper) {
      wrapper.appendChild(nav);
    }

    nav.setAttribute("data-prototype-analysis-tabs", "true");
    nav.className = "flex items-center justify-between gap-1 w-full px-margin-mobile pb-2 pt-4";
    nav.removeAttribute("style");

    orderedLabels.forEach((label) => {
      const button = buttonByLabel.get(label);
      const isActive = label === activeLabel;
      if (!button) {
        return;
      }

      button.className = [
        "flex-1",
        "flex",
        "items-center",
        "justify-center",
        "gap-xs",
        "px-2",
        "h-10",
        "rounded-full",
        isActive ? "bg-secondary-container" : "bg-surface-container",
        isActive ? "text-on-secondary-container" : "text-on-surface-variant",
        "text-[13px]",
        "font-label-md",
        "transition-all",
        "active:scale-95",
        isActive ? "shadow-sm" : ""
      ].filter(Boolean).join(" ");
      button.removeAttribute("style");
      button.innerHTML = `<span class="material-symbols-outlined text-[18px]">${iconByLabel[label]}</span>${label}`;

      if (!isActive) {
        bindFrameJump(button, routeByLabel[label]);
      }
    });
  }

  function hideAnalysisHeaderMoreButton(doc, routeId) {
    const analysisRoutes = new Set([
      "data-growth",
      "data-sleep-day",
      "data-sleep-month",
      "data-diet-week",
      "data-diet-month",
      "data-mood"
    ]);

    if (!analysisRoutes.has(routeId)) {
      return;
    }

    const header = doc.querySelector("header");
    if (!header) {
      return;
    }

    const moreButton = Array.from(header.querySelectorAll("button")).find((button) => {
      const text = (button.textContent || "").replace(/\s+/g, " ").trim();
      return text.includes("more_vert");
    }) || null;

    if (moreButton) {
      moreButton.remove();
    }
  }

  function reorderWishesCards(doc, orderedCards) {
    const grid = doc.querySelector("main .grid");
    const cards = orderedCards.filter(Boolean);
    // #region debug-point B:wishes-reorder
    reportDebug("B", "app.js:reorderWishesCards", "[DEBUG] reorderWishesCards called", {
      gridExists: Boolean(grid),
      orderedCount: cards.length,
      alreadyReordered: grid ? grid.dataset.prototypeWishesReordered === "true" : false
    });
    // #endregion
    if (!grid || cards.length < 2 || grid.dataset.prototypeWishesReordered === "true") {
      return;
    }
    cards.slice().reverse().forEach((card) => {
      grid.prepend(card);
    });
    grid.dataset.prototypeWishesReordered = "true";
  }

  function findBackButton(doc) {
    const interactiveBackButton = Array.from(doc.querySelectorAll("button, a")).find((node) => {
      const text = (node.textContent || "").trim();
      const onClick = node.getAttribute("onclick") || "";
      return /arrow_back|chevron_left|navigate_before|keyboard_backspace/.test(text) || onClick.includes("history.back()");
    });

    if (interactiveBackButton) {
      return interactiveBackButton;
    }

    return Array.from(doc.querySelectorAll("div")).find((node) => {
      const text = (node.textContent || "").trim();
      const onClick = node.getAttribute("onclick") || "";
      return /arrow_back|chevron_left|navigate_before|keyboard_backspace/.test(text) || onClick.includes("history.back()");
    }) || null;
  }

  function bindBackTarget(node, routeId) {
    if (!node) {
      return;
    }
    const target = node.closest("button, a, div") || node;
    target.dataset.prototypeBackRoute = routeId;
    target.style.cursor = "pointer";
    target.removeAttribute("onclick");
    try {
      target.onclick = null;
    } catch (_error) {
      // Ignore readonly handler cases inside iframe documents.
    }
  }

  function ensureProfileImages(doc) {
    const images = Array.from(doc.querySelectorAll("header img, img[alt*='Child'], img[alt*='Baby'], img[alt*='Profile']"));
    images.forEach((img) => {
      if (img.dataset.prototypeImgBound !== "true") {
        img.dataset.prototypeImgBound = "true";
        img.addEventListener("error", () => {
          img.src = fallbackProfileImage;
        });
      }

      if (img.complete && img.naturalWidth === 0) {
        img.src = fallbackProfileImage;
      }
    });
  }

  function unifyProfileHeaderVisuals(doc, routeId) {
    const excludedRoutes = new Set([
      "family-filter",
      "family-filtered-results",
      "family-search-results"
    ]);

    if (excludedRoutes.has(routeId)) {
      return;
    }

    const header = doc.querySelector("header");
    const profileImage = header ? header.querySelector("img[alt*='profile' i], img[alt*='child' i], img[alt*='baby' i]") : null;
    const avatarFrame = profileImage ? profileImage.parentElement : null;

    if (!header || !profileImage || !avatarFrame) {
      return;
    }

    avatarFrame.style.position = "relative";
    avatarFrame.style.width = "52px";
    avatarFrame.style.height = "52px";
    avatarFrame.style.minWidth = "52px";
    avatarFrame.style.borderRadius = "999px";
    avatarFrame.style.overflow = "hidden";
    avatarFrame.style.border = "3px solid #d7e6ed";
    avatarFrame.style.boxShadow = "0 8px 20px rgba(72, 95, 98, 0.12)";
    avatarFrame.style.background = "#eef4f3";
    avatarFrame.style.flexShrink = "0";

    profileImage.style.width = "100%";
    profileImage.style.height = "100%";
    profileImage.style.objectFit = "cover";

    const ageNodes = Array.from(header.querySelectorAll("span, div, p")).filter((node) => {
      const text = normalizeProfileBadgeText(node.textContent || "");
      if (!text) {
        return false;
      }
      return !node.contains(profileImage);
    });

    const existingOverlay = Array.from(avatarFrame.children).find((node) => {
      if (!(node instanceof HTMLElement) || node === profileImage) {
        return false;
      }
      return Boolean(normalizeProfileBadgeText(node.textContent || ""));
    }) || null;

    const badgeText = normalizeProfileBadgeText(existingOverlay ? existingOverlay.textContent || "" : "")
      || normalizeProfileBadgeText(ageNodes[0] ? ageNodes[0].textContent || "" : "")
      || "";

    if (!badgeText) {
      return;
    }

    let badge = existingOverlay;
    if (!badge) {
      badge = doc.createElement("div");
      avatarFrame.appendChild(badge);
    }

    badge.textContent = badgeText;
    badge.style.position = "absolute";
    badge.style.left = "50%";
    badge.style.bottom = "-4px";
    badge.style.transform = "translateX(-50%)";
    badge.style.padding = "3px 8px";
    badge.style.borderRadius = "999px";
    badge.style.background = "rgba(79, 97, 100, 0.92)";
    badge.style.color = "#ffffff";
    badge.style.fontSize = "10px";
    badge.style.fontWeight = "700";
    badge.style.lineHeight = "1";
    badge.style.letterSpacing = "0.02em";
    badge.style.whiteSpace = "nowrap";
    badge.style.boxShadow = "0 4px 12px rgba(44, 62, 64, 0.18)";
    badge.style.zIndex = "2";

    ageNodes.forEach((node) => {
      if (node !== badge) {
        node.remove();
      }
    });
  }

  function normalizeProfileBadgeText(text) {
    const trimmed = (text || "").replace(/\s+/g, " ").trim();
    const compact = trimmed.replace(/\s+/g, "");

    if (/^\d+Y\d+M$/i.test(compact)) {
      return compact.toUpperCase();
    }
    if (/^\d+M$/i.test(compact)) {
      return compact.toUpperCase();
    }
    if (/^\d+MO\d+D$/i.test(compact)) {
      return compact.toLowerCase().replace(/mo/, "mo ").replace(/d$/, "d");
    }

    return "";
  }

  function isBottomNavigationContainer(element) {
    const className = typeof element.className === "string" ? element.className : "";
    const text = (element.innerText || "").replace(/\s+/g, " ").trim();
    const labels = ["Journey", "Analysis", "Wishes", "Family", "记录", "旅程", "分析", "心愿", "分享"];
    const hitCount = labels.filter((label) => text.includes(label)).length;
    const hasBottomLayoutClass =
      className.includes("bottom-0") ||
      className.includes("safe-area-bottom") ||
      className.includes("rounded-t") ||
      className.includes("fixed bottom-0") ||
      className.includes("pt-2 bg-surface");

    return hitCount >= 3 && hasBottomLayoutClass;
  }

  function moveElementIntoScrollFlow(doc, options) {
    const element = doc.querySelector(options.selector);
    const target = doc.querySelector(options.targetSelector);
    if (!element || !target || element.dataset.prototypeFlowMoved === "true") {
      return;
    }

    element.dataset.prototypeFlowMoved = "true";
    element.classList.add(options.className);
    element.style.position = "static";
    element.style.left = "auto";
    element.style.right = "auto";
    element.style.bottom = "auto";
    element.style.inset = "auto";
    element.style.width = "100%";
    element.style.maxWidth = "100%";
    element.style.padding = "0";
    element.style.marginTop = "24px";
    element.style.marginBottom = "16px";
    element.style.zIndex = "1";

    target.appendChild(element);
  }

  function updateTabbarVisibility(routeId) {
    const hiddenRoutes = new Set([
      "family-members",
      "family-filter",
      "record-center"
    ]);
    elements.tabbar.style.display = hiddenRoutes.has(routeId) ? "none" : "grid";
  }

  function bindMilestoneMore(button, doc) {
    if (!button || button.dataset.prototypeMoreBound === "true") {
      return;
    }

    button.dataset.prototypeMoreBound = "true";
    button.style.cursor = "pointer";
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (button.dataset.prototypeExpanded === "true") {
        return;
      }

      button.dataset.prototypeExpanded = "true";
      button.textContent = "loading...";

      const listContainer = doc.querySelector(".flex.flex-col.gap-md");
      if (!listContainer) {
        button.textContent = "more";
        return;
      }

      const extraCards = [
        createMilestoneCard(doc, {
          date: "February 02, 2024",
          title: "First Giggle",
          iconWrapClass: "bg-secondary-container",
          iconClass: "text-on-secondary-container",
          icon: "sentiment_satisfied",
          image: "https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=1200&q=80",
          description: "That tiny giggle during bath time turned the whole room bright. We paused just to hear it again and again."
        }),
        createMilestoneCard(doc, {
          date: "January 18, 2024",
          title: "First Reach",
          iconWrapClass: "bg-tertiary-container",
          iconClass: "text-on-tertiary-container",
          icon: "front_hand",
          image: "https://images.unsplash.com/photo-1515488764276-beab7607c1e6?auto=format&fit=crop&w=1200&q=80",
          description: "Leo reached out and held onto mom's finger with intention for the first time, showing strong curiosity and connection."
        })
      ];

      window.setTimeout(() => {
        extraCards.forEach((card, index) => {
          card.style.opacity = "0";
          card.style.transform = "translateY(18px)";
          listContainer.appendChild(card);
          window.setTimeout(() => {
            card.style.transition = "opacity 0.35s ease, transform 0.35s ease";
            card.style.opacity = "1";
            card.style.transform = "translateY(0)";
          }, 40 + index * 80);
        });

        button.textContent = "all loaded";
        button.disabled = true;
        button.style.opacity = "0.7";
      }, 280);
    });
  }

  function bindProfileMoreMenu(doc, triggerButton) {
    if (!triggerButton || triggerButton.dataset.prototypeMenuBound === "true") {
      return;
    }

    triggerButton.dataset.prototypeMenuBound = "true";
    triggerButton.style.cursor = "pointer";

    let menu = null;

    const closeMenu = () => {
      if (!menu) {
        return;
      }
      menu.remove();
      menu = null;
    };

    const openMenu = () => {
      closeMenu();
      menu = doc.createElement("div");
      menu.setAttribute("data-prototype-profile-menu", "true");
      menu.style.position = "fixed";
      menu.style.top = "64px";
      menu.style.right = "16px";
      menu.style.zIndex = "9999";
      menu.style.minWidth = "104px";
      menu.style.background = "rgba(255,255,255,0.98)";
      menu.style.border = "1px solid rgba(73, 98, 105, 0.12)";
      menu.style.borderRadius = "14px";
      menu.style.boxShadow = "0 14px 32px rgba(31, 42, 46, 0.16)";
      menu.style.padding = "8px";

      const editButton = doc.createElement("button");
      editButton.type = "button";
      editButton.textContent = "编辑";
      editButton.style.width = "100%";
      editButton.style.border = "0";
      editButton.style.borderRadius = "10px";
      editButton.style.background = "transparent";
      editButton.style.color = "#496269";
      editButton.style.fontSize = "14px";
      editButton.style.fontWeight = "600";
      editButton.style.padding = "10px 12px";
      editButton.style.textAlign = "left";
      editButton.style.cursor = "pointer";
      editButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        closeMenu();
        setRoute("baby-profile-edit");
      });

      menu.appendChild(editButton);
      doc.body.appendChild(menu);
    };

    triggerButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (menu) {
        closeMenu();
        return;
      }
      openMenu();
    });

    doc.addEventListener("click", (event) => {
      if (!menu) {
        return;
      }
      const target = event.target;
      if (menu.contains(target) || triggerButton.contains(target)) {
        return;
      }
      closeMenu();
    });
  }

  function bindNumberSaveWorkflow(doc) {
    const minusIcon = doc.querySelector(".stepper-btn [data-icon='remove']");
    const plusIcon = doc.querySelector(".stepper-btn [data-icon='add']");
    const minusButton = minusIcon ? minusIcon.closest("button") : null;
    const plusButton = plusIcon ? plusIcon.closest("button") : null;
    const controlsRow = (minusButton ? minusButton.parentElement : null) || (plusButton ? plusButton.parentElement : null) || null;

    if (!controlsRow) {
      return;
    }

    let saveButton = doc.querySelector("[data-prototype-save-number='true']");
    if (!saveButton) {
      saveButton = doc.createElement("button");
      saveButton.type = "button";
      saveButton.setAttribute("data-prototype-save-number", "true");
      saveButton.style.display = "none";
      saveButton.style.width = "100%";
      saveButton.style.marginTop = "20px";
      saveButton.style.border = "0";
      saveButton.style.borderRadius = "999px";
      saveButton.style.background = "#496269";
      saveButton.style.color = "#ffffff";
      saveButton.style.boxShadow = "0 10px 24px rgba(73, 98, 105, 0.18)";
      saveButton.style.padding = "18px 20px";
      saveButton.style.fontSize = "15px";
      saveButton.style.fontWeight = "600";
      saveButton.style.display = "none";
      saveButton.innerHTML = '<span class="material-symbols-outlined" style="font-size:20px; vertical-align:middle; margin-right:10px;">save</span><span style="vertical-align:middle;">Save Changes</span>';
      saveButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        setRoute("wishes-list");
      });
      controlsRow.insertAdjacentElement("afterend", saveButton);
    }

    const showSaveButton = () => {
      saveButton.style.display = "block";
    };

    [minusButton, plusButton].forEach((button) => {
      if (!button || button.dataset.prototypeSaveTriggerBound === "true") {
        return;
      }
      button.dataset.prototypeSaveTriggerBound = "true";
      button.addEventListener("click", () => {
        showSaveButton();
      });
    });
  }

  function bindMuseumEditWorkflow(doc) {
    const backButton = doc.querySelector("header button") || findBackButton(doc);
    const inputField = doc.getElementById("new-item-input");
    const addButton = doc.getElementById("add-item-btn");
    const checklistContainer = doc.getElementById("checklist-container");
    const actionButtons = Array.from(doc.querySelectorAll("button"));
    const cancelButton = actionButtons.find((button) => (button.textContent || "").trim() === "Cancel") || null;
    const doneButton = actionButtons.find((button) => (button.textContent || "").trim() === "Done") || null;

    bindBackTarget(backButton, "wishes-museum");

    if (!inputField || !addButton || !checklistContainer) {
      return;
    }

    const draftItems = readPrototypeStore(storageKeys.wishesMuseumDraft, []);
    if (Array.isArray(draftItems) && draftItems.length) {
      draftItems.forEach((item) => appendMuseumEditRow(doc, checklistContainer, item));
    }

    const handleAdd = () => {
      const value = inputField.value.trim();
      if (!value) {
        return;
      }
      const draftList = readPrototypeStore(storageKeys.wishesMuseumDraft, []);
      draftList.push(value);
      writePrototypeStore(storageKeys.wishesMuseumDraft, draftList);
      appendMuseumEditRow(doc, checklistContainer, value);
      inputField.value = "";
    };

    if (addButton.dataset.prototypeMuseumAddBound !== "true") {
      addButton.dataset.prototypeMuseumAddBound = "true";
      addButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        handleAdd();
      });
    }

    if (inputField.dataset.prototypeMuseumEnterBound !== "true") {
      inputField.dataset.prototypeMuseumEnterBound = "true";
      inputField.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          handleAdd();
        }
      });
    }

    if (cancelButton && cancelButton.dataset.prototypeMuseumCancelBound !== "true") {
      cancelButton.dataset.prototypeMuseumCancelBound = "true";
      cancelButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        clearPrototypeStore(storageKeys.wishesMuseumDraft);
        setRoute("wishes-museum");
      });
    }

    if (doneButton && doneButton.dataset.prototypeMuseumDoneBound !== "true") {
      doneButton.dataset.prototypeMuseumDoneBound = "true";
      doneButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const draftList = readPrototypeStore(storageKeys.wishesMuseumDraft, []);
        if (Array.isArray(draftList) && draftList.length) {
          const committed = readPrototypeStore(storageKeys.wishesMuseumCommitted, []);
          writePrototypeStore(storageKeys.wishesMuseumCommitted, committed.concat(draftList));
        }
        clearPrototypeStore(storageKeys.wishesMuseumDraft);
        setRoute("wishes-museum");
      });
    }
  }

  function appendMuseumEditRow(doc, container, title) {
    const row = doc.createElement("div");
    row.className = "flex items-center gap-md p-md bg-white rounded-lg shadow-[0px_30px_30px_rgba(0,0,0,0.02)] border border-surface-container group hover:scale-[1.01] transition-transform animate-in slide-in-from-bottom-2 duration-300";
    row.innerHTML = `
      <button aria-label="Delete item" class="w-10 h-10 flex items-center justify-center rounded-full text-error hover:bg-error-container transition-colors">
        <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">do_not_disturb_on</span>
      </button>
      <div class="flex-1">
        <p class="font-body-md text-body-md font-bold text-on-surface">${escapeHtml(title)}</p>
        <p class="font-label-sm text-label-sm text-on-surface-variant">New Task</p>
      </div>
      <div class="cursor-grab active:cursor-grabbing p-1 text-outline-variant hover:text-outline transition-colors">
        <span class="material-symbols-outlined">drag_indicator</span>
      </div>
    `;
    const deleteButton = row.querySelector('[aria-label="Delete item"]');
    if (deleteButton) {
      deleteButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        row.remove();
      });
    }
    container.appendChild(row);
  }

  function renderPersistedMuseumItems(doc) {
    const items = readPrototypeStore(storageKeys.wishesMuseumCommitted, []);
    // #region debug-point C:persisted-items
    reportDebug("C", "app.js:renderPersistedMuseumItems", "[DEBUG] renderPersistedMuseumItems called", {
      committedCount: Array.isArray(items) ? items.length : -1
    });
    // #endregion
    if (!Array.isArray(items) || !items.length) {
      return;
    }
    const checklistHeading = findNodeByText(doc, "section h4", "Museum Checklist");
    const checklistSection = checklistHeading ? checklistHeading.closest("section") : null;
    const listContainer = checklistSection ? checklistSection.querySelector(".space-y-sm") : null;
    if (!listContainer || listContainer.dataset.prototypePersistedMuseumRendered === "true") {
      return;
    }
    listContainer.dataset.prototypePersistedMuseumRendered = "true";
    items.forEach((item) => {
      const card = doc.createElement("div");
      card.className = "flex items-center gap-md p-md bg-white rounded-lg shadow-sm border border-surface-container";
      card.innerHTML = `
        <div class="w-8 h-8 flex items-center justify-center rounded-full border-2 border-outline-variant text-transparent">
          <span class="material-symbols-outlined text-[18px]">circle</span>
        </div>
        <div class="flex-1">
          <p class="font-body-md text-body-md font-bold text-on-surface">${escapeHtml(item)}</p>
          <p class="font-label-sm text-label-sm text-on-surface-variant">Newly added from edit list</p>
        </div>
      `;
      listContainer.appendChild(card);
    });
  }

  function bindMuseumChecklistSaveFlow(doc) {
    const checklistHeading = findNodeByText(doc, "section h4", "Museum Checklist");
    const checklistSection = checklistHeading ? checklistHeading.closest("section") : null;
    const listContainer = checklistSection ? checklistSection.querySelector(".space-y-sm") : null;
    const saveAnchor = listContainer || checklistSection;
    if (!saveAnchor) {
      return;
    }

    let saveButton = doc.querySelector("[data-prototype-museum-save='true']");
    if (!saveButton) {
      saveButton = doc.createElement("button");
      saveButton.type = "button";
      saveButton.setAttribute("data-prototype-museum-save", "true");
      saveButton.style.display = "none";
      saveButton.style.width = "100%";
      saveButton.style.marginTop = "20px";
      saveButton.style.border = "0";
      saveButton.style.borderRadius = "999px";
      saveButton.style.background = "#496269";
      saveButton.style.color = "#ffffff";
      saveButton.style.boxShadow = "0 10px 24px rgba(73, 98, 105, 0.18)";
      saveButton.style.padding = "18px 20px";
      saveButton.style.fontSize = "15px";
      saveButton.style.fontWeight = "600";
      saveButton.textContent = "Save Changes";
      saveButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        setRoute("wishes-list");
      });
      saveAnchor.insertAdjacentElement("afterend", saveButton);
    }

    const checklistRows = Array.from((listContainer && listContainer.children) || []).filter((row) => row.querySelector(".material-symbols-outlined"));
    checklistRows.forEach((row) => {
      if (row.dataset.prototypeMuseumChecklistBound === "true") {
        return;
      }
      row.dataset.prototypeMuseumChecklistBound = "true";
      const iconContainer = row.querySelector(".w-8, .w-10");
      const icon = row.querySelector(".material-symbols-outlined");
      const target = iconContainer || row;

      if (target) {
        target.style.cursor = "pointer";
      }

      target.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (!iconContainer || !icon) {
          return;
        }

        const isChecked = (icon.textContent || "").trim() === "check_circle";
        if (isChecked) {
          icon.textContent = "circle";
          icon.style.fontVariationSettings = "'FILL' 0";
          iconContainer.classList.add("border-2", "border-outline-variant", "text-transparent");
          iconContainer.classList.remove("bg-primary", "text-on-primary");
          icon.classList.remove("text-[20px]");
          icon.classList.add("text-[18px]");
        } else {
          icon.textContent = "check_circle";
          icon.style.fontVariationSettings = "'FILL' 1";
          iconContainer.classList.remove("border-2", "border-outline-variant", "text-transparent");
          iconContainer.classList.add("bg-primary", "text-on-primary");
          icon.classList.add("text-[20px]");
          icon.classList.remove("text-[18px]");
        }

        saveButton.style.display = "block";
        // #region debug-point A:checkbox-toggle
        reportDebug("A", "app.js:bindMuseumChecklistSaveFlow", "[DEBUG] museum checkbox toggled", {
          title: (() => {
            const titleNode = row.querySelector(".font-body-md");
            return titleNode && typeof titleNode.textContent === "string" ? titleNode.textContent.trim() : "";
          })(),
          nowChecked: (icon.textContent || "").trim() === "check_circle"
        });
        // #endregion
      }, true);
    });
  }

  function readPrototypeStore(key, fallbackValue) {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallbackValue;
    } catch (error) {
      return fallbackValue;
    }
  }

  function writePrototypeStore(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      // Ignore storage failures in demo mode.
    }
  }

  function clearPrototypeStore(key) {
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      // Ignore storage failures in demo mode.
    }
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function createMilestoneCard(doc, item) {
    const article = doc.createElement("article");
    article.className = "flex flex-col bg-surface-container-lowest rounded-lg overflow-hidden soft-shadow border border-surface-variant group milestone-card";
    article.innerHTML = [
      '<div class="relative h-48 overflow-hidden">',
      `<img alt="${item.title}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" src="${item.image}">`,
      '<div class="absolute top-4 right-4 glass-effect px-3 py-1 rounded-full">',
      `<span class="font-label-md text-on-surface text-caption">${item.date}</span>`,
      "</div>",
      '<div class="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/10 to-transparent"></div>',
      "</div>",
      '<div class="p-lg flex flex-col space-y-xs">',
      '<div class="flex items-center justify-between">',
      `<h2 class="font-headline-md text-headline-md text-secondary">${item.title}</h2>`,
      `<div class="w-8 h-8 rounded-full ${item.iconWrapClass} flex items-center justify-center flex-shrink-0">`,
      `<span class="material-symbols-outlined ${item.iconClass} text-[18px]" style="font-variation-settings: 'FILL' 1;">${item.icon}</span>`,
      "</div>",
      "</div>",
      `<p class="font-body-md text-on-surface-variant leading-relaxed">${item.description}</p>`,
      "</div>"
    ].join("");
    return article;
  }

  function bindFrameBackActions(doc, route) {
    const backButtons = Array.from(doc.querySelectorAll("button, a, div")).filter((node) => {
      const text = (node.textContent || "").trim();
      const hasBackIcon = /arrow_back|chevron_left|navigate_before|keyboard_backspace/.test(text);
      const onClick = node.getAttribute("onclick") || "";
      const ariaLabel = (node.getAttribute("aria-label") || "").trim();
      return hasBackIcon
        || onClick.includes("history.back()")
        || ariaLabel === "Back"
        || Boolean(node.dataset.prototypeBackRoute);
    });

    backButtons.forEach((node) => {
      if (node.dataset.prototypeBackBound === "true") {
        return;
      }

      node.dataset.prototypeBackBound = "true";
      node.style.cursor = "pointer";
      node.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (node.dataset.prototypeBackRoute) {
          setRoute(node.dataset.prototypeBackRoute);
          return;
        }
        navigateBack(route);
      });
    });
  }

  function navigateBack(route) {
    const referrer = document.referrer;
    const currentFile = window.location.pathname.split("/").pop() || "";
    const hasSameAppReferrer = referrer.includes("/prototype_demo/") && !referrer.endsWith(`/${currentFile}`);
    const explicitFallbackByRoute = {
      "family-invite-token": "family-invite"
    };

    if (hasSameAppReferrer) {
      window.history.back();
      return;
    }

    const module = moduleMap.get(route.module);
    const fallbackRouteId = explicitFallbackByRoute[route.id]
      || (module && module.defaultRoute !== route.id ? module.defaultRoute : "journey-home");
    window.location.href = getRouteFileName(fallbackRouteId);
  }

  function openDrawer() {
    document.body.classList.add("drawer-open");
    elements.drawer.setAttribute("aria-hidden", "false");
  }

  function closeDrawer() {
    document.body.classList.remove("drawer-open");
    elements.drawer.setAttribute("aria-hidden", "true");
  }

  function updatePrevNext(moduleId, routeId) {
    const moduleRoutes = routesByModule[moduleId];
    const index = moduleRoutes.findIndex((route) => route.id === routeId);
    const prevRoute = moduleRoutes[index - 1];
    const nextRoute = moduleRoutes[index + 1];

    elements.prevButton.disabled = !prevRoute;
    elements.nextButton.disabled = !nextRoute;
    elements.prevButton.style.opacity = prevRoute ? "1" : "0.45";
    elements.nextButton.style.opacity = nextRoute ? "1" : "0.45";

    elements.prevButton.onclick = () => {
      if (prevRoute) {
        setRoute(prevRoute.id);
        closeDrawer();
      }
    };

    elements.nextButton.onclick = () => {
      if (nextRoute) {
        setRoute(nextRoute.id);
        closeDrawer();
      }
    };
  }

  function render() {
    const route = getCurrentRoute();
    const module = moduleMap.get(route.module);

    renderModuleButtons(module.id);
    renderFlows(route.id);
    renderScreenList(module.id, route.id);
    renderTabbar(module.id);
    updateTabbarVisibility(route.id);
    renderFlowContext(route.id);
    renderStepper(route.id);
    renderQuickActions(route);
    loadFrame(route);
    updatePrevNext(module.id, route.id);

    elements.currentModuleLabel.textContent = module.label;
    elements.currentTitle.textContent = route.title;
    elements.currentSummary.textContent = route.summary;
  }

  elements.frame.addEventListener("load", () => {
    enhanceIframe(getCurrentRoute());
    elements.frameLoading.classList.add("hidden");
  });

  elements.resetRoute.addEventListener("click", () => {
    setRoute("journey-home");
    closeDrawer();
  });
  elements.menuToggle.addEventListener("click", () => {
    if (document.body.classList.contains("drawer-open")) {
      closeDrawer();
    } else {
      openDrawer();
    }
  });
  elements.drawerClose.addEventListener("click", closeDrawer);
  elements.drawerMask.addEventListener("click", closeDrawer);

  render();
})();
