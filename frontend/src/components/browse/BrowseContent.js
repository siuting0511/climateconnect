import { Container, Divider, makeStyles, Tab, Tabs, useMediaQuery } from "@material-ui/core";
import EmojiObjectsIcon from '@material-ui/icons/EmojiObjects';
import _ from "lodash";
import React, { useContext, useEffect, useRef, useState } from "react";
import Cookies from "universal-cookie";
import getFilters from "../../../public/data/possibleFilters";
import { membersWithAdditionalInfo } from "../../../public/lib/getOptions";
import { indicateWrongLocation, isLocationValid } from "../../../public/lib/locationOperations";
import { getUserOrganizations } from "../../../public/lib/organizationOperations";
import {
  getInfoMetadataByType,
  getReducedPossibleFilters
} from "../../../public/lib/parsingOperations";
import { findOptionByNameDeep, getFilterUrl, getSearchParams } from "../../../public/lib/urlOperations";
import getTexts from "../../../public/texts/texts";
import LoadingContext from "../context/LoadingContext";
import UserContext from "../context/UserContext";
import FilterContent from "../filter/FilterContent";
import LoadingSpinner from "../general/LoadingSpinner";
import IdeasBoard from "../ideas/IdeasBoard";
import FilterSection from "../indexPage/FilterSection";
import OrganizationPreviews from "../organization/OrganizationPreviews";
import ProfilePreviews from "../profile/ProfilePreviews";
import ProjectPreviews from "../project/ProjectPreviews";
import Tutorial from "../tutorial/Tutorial";
import NoItemsFound from "./NoItemsFound";

const useStyles = makeStyles((theme) => {
  return {
    tab: {
      width: 200,
      paddingLeft: theme.spacing(2),
      paddingRight: theme.spacing(2),
    },
    tabContent: {
      marginTop: theme.spacing(2),
      marginBottom: theme.spacing(2),
    },
    mainContentDivider: {
      marginBottom: theme.spacing(3),
    },
    ideasTabLabel: {
      display: "flex",
      alignItems: "center",
    },
    ideasIcon: {
      marginRight: theme.spacing(1),
      color: theme.palette.primary.main,
    },
  };
});

export default function BrowseContent({
  initialMembers,
  initialOrganizations,
  initialProjects,
  initialIdeas,
  applyNewFilters,
  customSearchBarLabels,
  errorMessage,
  filterChoices,
  handleSetErrorMessage,
  hideMembers,
  hubName,
  hubProjectsButtonRef,
  hubQuickInfoRef,
  hubsSubHeaderRef,
  loadMoreData,
  nextStepTriggeredBy,
  showIdeas,
  allHubs,
  initialIdeaUrlSlug,
  hubLocation,
  hubData,
  filters,
  handleUpdateFilterValues,
  initialLocationFilter
}) {
  const initialState = {
    items: {
      projects: initialProjects ? [...initialProjects.projects] : [],
      organizations: initialOrganizations ? [...initialOrganizations.organizations] : [],
      ideas: initialIdeas ? [...initialIdeas.ideas] : [],
      members:
        initialMembers && !hideMembers ? membersWithAdditionalInfo(initialMembers.members) : [],
    },
    hasMore: {
      projects: !!initialProjects && initialProjects.hasMore,
      organizations: !!initialOrganizations && initialOrganizations.hasMore,
      members: !!initialMembers && initialMembers.hasMore,
      ideas: !!initialIdeas && initialIdeas.hasMore,
    },
    nextPages: {
      projects: 2,
      members: 2,
      organizations: 2,
      ideas: 2,
    },
    urlEnding: "",
  };
  const isNarrowScreen = useMediaQuery((theme) => theme.breakpoints.down("sm"));
  const token = new Cookies().get("token");
  //saving these refs for the tutorial
  const firstProjectCardRef = useRef(null);
  const filterButtonRef = useRef(null);
  const organizationsTabRef = useRef(null);

  const legacyModeEnabled = process.env.ENABLE_LEGACY_LOCATION_FORMAT === "true";
  const classes = useStyles();
  const TYPES_BY_TAB_VALUE = hideMembers
    ? ["projects", "organizations"]
    : ["projects", "organizations", "members"];
  if (showIdeas) {
    TYPES_BY_TAB_VALUE.push("ideas");
  }
  const { locale } = useContext(UserContext);
  const texts = getTexts({ page: "general", locale: locale });
  const type_names = {
    projects: texts.projects,
    organizations: isNarrowScreen ? texts.orgs : texts.organizations,
    members: texts.members,
    ideas: texts.ideas,
  };
  const [hash, setHash] = useState(null);
  const [tabValue, setTabValue] = useState(hash ? TYPES_BY_TAB_VALUE.indexOf(hash) : 0);

  const isMobileScreen = useMediaQuery((theme) => theme.breakpoints.down("xs"));

  // Always default to filters being expanded
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  // On mobile filters take up the whole screen so they aren't expanded by default
  const [filtersExandedOnMobile, setFiltersExpandedOnMobile] = useState(false);
  const [state, setState] = useState(initialState);

  const locationInputRefs = {
    projects: useRef(null),
    organizations: useRef(null),
    members: useRef(null),
  };

  const [locationOptionsOpen, setLocationOptionsOpen] = useState(false);
  const [userOrganizations, setUserOrganizations] = useState(null);
  const handleSetLocationOptionsOpen = (bool) => {
    setLocationOptionsOpen(bool);
  };
  //When switching to the ideas tab: catch the orgs the user is a part of. 
  //This info is required to share an idea
  useEffect(async function () {
    if (tabValue === TYPES_BY_TAB_VALUE.indexOf("ideas") && userOrganizations === null) {
      setUserOrganizations("");
      const userOrgsFromServer = await getUserOrganizations(token, locale);
      setUserOrganizations(userOrgsFromServer || []);
    }
  });
  // We have 2 distinct loading states: filtering, and loading more data. For
  // each state, we want to treat the loading spinner a bit differently, hence
  // why we have two separate pieces of state
  const [isFiltering, setIsFiltering] = useState(false);
  const [isFetchingMoreData, setIsFetchingMoreData] = useState(false);

  const hasQueryParams = (Object.keys(getSearchParams(window.location.search)).length === 0) !== 0;

  /**
   * Support the functionality of a user entering
   * a provided URL, that already has URL encoded
   * query params from a filter in it. In this use
   * case, we should automatically set the filters dynamically. Ensure
   * that this isn't invoked on extraneous renders.
   */
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const newHash = window?.location?.hash.replace("#", "")
    if (window.location.hash) {
      setHash(newHash);
      setTabValue(TYPES_BY_TAB_VALUE.indexOf(newHash));
    }
    if (!initialized) {
      // Update the state of the visual filters, like Select, Dialog, etc
      // Then actually fetch the data. We need a way to map what's
      // in the query param, to what UI element is present on the screen. For
      // example, if we have a MultiLevelSelect dialog representing categories
      // and we have a ?&category=Food waste, then we need to update the
      // the MultiLevelSelect dialog's selection to that value somehow.

      // For each query param option, ensure that it's
      // split into array before spreading onto the new filters object.
      const queryObject = getQueryObjectFromUrl(getSearchParams(window.location.search));
      const newFilters = {
        ...queryObject,
      };

      if(initialLocationFilter) {
        const tabKey = newHash ? newHash : TYPES_BY_TAB_VALUE[0]
        const possibleFilters = getFilters({key: tabKey, filterChoices: filterChoices, locale: locale})
        const locationFilter = possibleFilters.find(f=>f.type === "location")
        newFilters[locationFilter.key] = initialLocationFilter
      }

      const tabName = TYPES_BY_TAB_VALUE[tabValue];
      // Apply new filters with the query object immediately:
      handleApplyNewFilters(tabName, newFilters, false, state.urlEnding);

      // And then update state
      setInitialized(true);
    }
  }, []);

  /*This is specifically for location hubs:
    Sector hubs don't show members
    We only know whether a hub is a location hub after loading initial props
    Therefore we only catch members on location hubs after they are initialized.
  */
  useEffect(
    function () {
      if (initialMembers) {
        setState({
          ...state,
          items: { ...state.items, members: membersWithAdditionalInfo(initialMembers.members) },
          hasMore: { ...state.hasMore, members: initialMembers.hasMore },
        });
      }
    },
    [initialMembers]
  );

  const handleTabChange = (event, newValue) => {
    if (hasQueryParams) {
      // Update the state of the visual filters, like Select, Dialog, etc
      // Then actually fetch the data. We need a way to map what's
      // in the query param, to what UI element is present on the screen. For
      // example, if we have a MultiLevelSelect dialog representing categories
      // and we have a ?&category=Food waste, then we need to update the
      // the MultiLevelSelect dialog's selection to that value somehow.

      // For each query param option, ensure that it's
      // split into array before spreading onto the new filters object.
      const emptyFilters = getReducedPossibleFilters(
        getFilters({
          key: TYPES_BY_TAB_VALUE[0],
          filterChoices: filterChoices,
          locale: locale,
        })
      );
      delete emptyFilters.location;
      const queryObject = getQueryObjectFromUrl(getSearchParams(window.location.search));
      //location is always set to "" here
      
      //persist the old location filter when switching tabs
      const tabKey = TYPES_BY_TAB_VALUE[newValue]
      const possibleFilters = getFilters({key: tabKey, filterChoices: filterChoices, locale: locale})
      const locationFilter = possibleFilters.find(f=>f.type === "location")
      queryObject[locationFilter.key] = filters[locationFilter.key]
      queryObject

      const newFilters = { ...emptyFilters, ...queryObject };
      const tabValue = TYPES_BY_TAB_VALUE[newValue];
      // Apply new filters with the query object immediately:
      handleApplyNewFilters(tabValue, newFilters, false, state.urlEnding);
    }

    window.location.hash = TYPES_BY_TAB_VALUE[newValue];
    setTabValue(newValue);
  };

  /* We always save filter values in the url in english. 
  Therefore we need to get the name in the current language
  when retrieving them from the query object */
  const getValueInCurrentLanguage = (metadata, value) => {
    return findOptionByNameDeep({
      filterChoices: metadata.options,
      propertyToFilterBy: "original_name",
      valueToFilterBy: value
    }).name
  };

  const getQueryObjectFromUrl = (query) => {
    const queryObject = _.cloneDeep(query);
    const possibleFiltersMetadata = getFilters({
      key: "all",
      filterChoices: filterChoices,
      locale: locale,
    });
    for (const [key, value] of Object.entries(queryObject)) {
      const metadata = possibleFiltersMetadata.find((f) => f.key === key);

      if (value.indexOf(",") > 0) {
        queryObject[key] = value.split(",").map((v) => getValueInCurrentLanguage(metadata, v));
      } else if (metadata?.type === "multiselect" || metadata?.type === "openMultiSelectDialogButton") {
        queryObject[key] = [getValueInCurrentLanguage(metadata, value)];
      } else if (key === "radius") {
        queryObject[key] = value + "km"
      }
    }
    return queryObject;
  };

  const unexpandFilters = () => {
    setFiltersExpanded(false);
  };

  const unexpandFiltersOnMobile = () => {
    setFiltersExpandedOnMobile(false);
  };

  const loadMoreProjects = async () => {
    await handleLoadMoreData("projects");
  };

  const loadMoreOrganizations = async () => {
    await handleLoadMoreData("organizations");
  };

  const loadMoreMembers = async () => {
    await handleLoadMoreData("members");
  };

  const loadMoreIdeas = async () => {
    await handleLoadMoreData("ideas");
  };

  const handleLoadMoreData = async (type) => {
    try {
      setIsFetchingMoreData(true);
      const res = await loadMoreData(type, state.nextPages[type], state.urlEnding);

      // TODO: these setState and hooks calls should likely be memoized and combined
      setIsFetchingMoreData(false);
      setState({
        ...state,
        nextPages: {
          ...state.nextPages,
          [type]: state.nextPages[type] + 1,
        },
        hasMore: {
          ...state.hasMore,
          [type]: res.hasMore,
        },
        items: {
          ...state.items,
          [type]: [...state.items[type], ...res.newData],
        },
      });
      return [...res.newData];
    } catch (e) {
      setState({
        ...state,
        hasMore: { ...state.hasMore, [type]: false },
      });
    }
  };

  /**
   * Sets loading state to true to until the results are
   * returned from applying the new filters. Then updates the
   * state, and persists the new filters as query params in the URL.
   */
  const handleApplyNewFilters = async (type, newFilters, closeFilters) => {
    const newUrl = getFilterUrl({
      activeFilters: newFilters,
      infoMetadata: getInfoMetadataByType(type),
      filterChoices: filterChoices,
      locale: locale,
    });
    if (newUrl !== window?.location?.href) {
      window.history.pushState({}, "", newUrl);
    }
    // Only push state if there's a URL change. Be sure to account for the
    // hash link / fragment on the end of the URL (e.g. #skills).

    if (!legacyModeEnabled && newFilters.location && !isLocationValid(newFilters.location)) {
      indicateWrongLocation(
        locationInputRefs[type],
        setLocationOptionsOpen,
        handleSetErrorMessage,
        texts
      );
      return;
    }

    handleSetErrorMessage("");
    setIsFiltering(true);

    const res = await applyNewFilters(type, newFilters, closeFilters);
    if (res?.closeFilters) {
      if (isMobileScreen) setFiltersExpandedOnMobile(false);
      else setFiltersExpanded(false);
    }

    if (res?.filteredItemsObject) {
      setState({
        ...state,
        items: { ...state.items, [type]: res.filteredItemsObject[type] },
        hasMore: { ...state.hasMore, [type]: res.filteredItemsObject.hasMore },
        urlEnding: res.newUrlEnding,
        nextPages: { ...state.nextPages, [type]: 2 },
      });
    }
    setIsFiltering(false);
  };

  /**
   * Asynchonously get new projects, orgs or members. We render
   * a loading spinner until the request is done.
   */
  const handleSearchSubmit = async (type, searchValue) => {
    setIsFiltering(true);
    const newFilters = { ...filters, search: searchValue };
    const newUrl = getFilterUrl({
      activeFilters: newFilters,
      infoMetadata: getInfoMetadataByType(type),
      filterChoices: filterChoices,
      locale: locale,
    });
    const res = await applyNewFilters(type, newFilters, false);
    setIsFiltering(false);
    if (newUrl !== window?.location?.href) {
      window.history.pushState({}, "", newUrl);
    }

    if (res?.filteredItemsObject) {
      setState({
        ...state,
        items: { ...state.items, [type]: res.filteredItemsObject[type] },
        hasMore: { ...state.hasMore, [type]: res.filteredItemsObject.hasMore },
        urlEnding: res.newUrlEnding,
        nextPages: { ...state.nextPages, [type]: 2 },
      });
    }
  };
  

  const handleUpdateIdeaRating = (idea, newRating) => {
    const ideaInState = state.items.ideas.find((si) => si.url_slug === idea.url_slug);
    const ideaIndex = state.items.ideas.indexOf(ideaInState);
    setState({
      ...state,
      items: {
        ...state.items,
        ideas: [
          ...state.items.ideas.slice(0, ideaIndex),
          {
            ...idea,
            rating: newRating,
          },
          ...state.items.ideas.slice(ideaIndex + 1),
        ],
      },
    });
  };

  return (
    <LoadingContext.Provider
      value={{
        spinning: isFetchingMoreData || isFiltering,
      }}
    >
      <Container maxWidth="lg">
        <FilterSection
          filtersExpanded={isMobileScreen ? filtersExandedOnMobile : filtersExpanded}
          onSubmit={handleSearchSubmit}
          setFiltersExpanded={isMobileScreen ? setFiltersExpandedOnMobile : setFiltersExpanded}
          type={TYPES_BY_TAB_VALUE[tabValue]}
          customSearchBarLabels={customSearchBarLabels}
          filterButtonRef={filterButtonRef}
          searchValue={filters.search}
          hideFilterButton={tabValue === TYPES_BY_TAB_VALUE.indexOf("ideas")}
        />
        <Tabs
          variant={isNarrowScreen ? "fullWidth" : "standard"}
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          centered={true}
        >
          {TYPES_BY_TAB_VALUE.map((t, index) => {
            const tabProps = {
              label: type_names[t],
              className: classes.tab,
            };
            if (index === TYPES_BY_TAB_VALUE.indexOf("ideas")) {
              tabProps.label = (
                <div className={classes.ideasTabLabel}>
                  <EmojiObjectsIcon className={classes.ideasIcon} /> {type_names[t]}
                </div>
              );
            }
            if (index === 1) tabProps.ref = organizationsTabRef;
            return <Tab {...tabProps} key={index} />;
          })}
        </Tabs>

        <Divider className={classes.mainContentDivider} />

        <>
          <TabContent value={tabValue} index={0}>
            {filtersExpanded && tabValue === TYPES_BY_TAB_VALUE.indexOf("projects") && (
              <FilterContent
                className={classes.tabContent}
                type={TYPES_BY_TAB_VALUE[TYPES_BY_TAB_VALUE.indexOf("projects")]}
                applyFilters={handleApplyNewFilters}
                filters={filters}
                handleUpdateFilters={handleUpdateFilterValues}
                errorMessage={errorMessage}
                filtersExpanded={isMobileScreen ? filtersExandedOnMobile : filtersExpanded}
                handleSetLocationOptionsOpen={handleSetLocationOptionsOpen}
                locationInputRef={
                  locationInputRefs[TYPES_BY_TAB_VALUE[TYPES_BY_TAB_VALUE.indexOf("projects")]]
                }
                locationOptionsOpen={locationOptionsOpen}
                possibleFilters={getFilters({
                  key: TYPES_BY_TAB_VALUE[0],
                  filterChoices: filterChoices,
                  locale: locale,
                })}
                unexpandFilters={isMobileScreen ? unexpandFiltersOnMobile : unexpandFilters}
                initialLocationFilter={initialLocationFilter}
              />
            )}
            {/*
              We have two loading spinner states: filtering, and fetching more data.
              When filtering, the spinner replaces the Previews components.
              When fetching more data, the spinner appears under the last row of the Previews components.
              Render the not found page if the object came back empty.
            */}
            {isFiltering ? (
              <LoadingSpinner />
            ) : state?.items?.projects?.length ? (
              <ProjectPreviews
                className={classes.itemsContainer}
                hasMore={state.hasMore.projects}
                loadFunc={loadMoreProjects}
                parentHandlesGridItems
                projects={state.items.projects}
                firstProjectCardRef={firstProjectCardRef}
              />
            ) : (
              <NoItemsFound type="projects" />
            )}
          </TabContent>
          <TabContent
            value={tabValue}
            index={TYPES_BY_TAB_VALUE.indexOf("organizations")}
            className={classes.tabContent}
          >
            {filtersExpanded && tabValue === TYPES_BY_TAB_VALUE.indexOf("organizations") && (
              <FilterContent
                className={classes.tabContent}
                type={TYPES_BY_TAB_VALUE[TYPES_BY_TAB_VALUE.indexOf("organizations")]}
                applyFilters={handleApplyNewFilters}
                errorMessage={errorMessage}
                filters={filters}
                handleUpdateFilters={handleUpdateFilterValues}
                filtersExpanded={filtersExpanded}
                handleSetLocationOptionsOpen={handleSetLocationOptionsOpen}
                unexpandFilters={isMobileScreen ? unexpandFiltersOnMobile : unexpandFilters}
                locationInputRef={
                  locationInputRefs[TYPES_BY_TAB_VALUE[TYPES_BY_TAB_VALUE.indexOf("organizations")]]
                }
                locationOptionsOpen={locationOptionsOpen}
                possibleFilters={getFilters({
                  key: TYPES_BY_TAB_VALUE[1],
                  filterChoices: filterChoices,
                  locale: locale,
                })}
                initialLocationFilter={initialLocationFilter}
              />
            )}

            {/*
              We have two loading spinner states: filtering, and fetching more data.
              When filtering, the spinner replaces the Previews components.
              When fetching more data, the spinner appears under the last row of the Previews components.
              Render the not found page if the object came back empty.
            */}
            {isFiltering ? (
              <LoadingSpinner />
            ) : state?.items?.organizations?.length ? (
              <OrganizationPreviews
                hasMore={state.hasMore.organizations}
                loadFunc={loadMoreOrganizations}
                organizations={state.items.organizations}
                parentHandlesGridItems
                showOrganizationType
              />
            ) : (
              <NoItemsFound type="organizations" />
            )}
          </TabContent>

          {!hideMembers && (
            <TabContent
              value={tabValue}
              index={TYPES_BY_TAB_VALUE.indexOf("members")}
              className={classes.tabContent}
            >
              {filtersExpanded && tabValue === TYPES_BY_TAB_VALUE.indexOf("members") && (
                <FilterContent
                  className={classes.tabContent}
                  filters={filters}
                  handleUpdateFilters={handleUpdateFilterValues}
                  type={TYPES_BY_TAB_VALUE[TYPES_BY_TAB_VALUE.indexOf("members")]}
                  applyFilters={handleApplyNewFilters}
                  filtersExpanded={filtersExpanded}
                  errorMessage={errorMessage}
                  unexpandFilters={unexpandFilters}
                  possibleFilters={getFilters({
                    key: TYPES_BY_TAB_VALUE[TYPES_BY_TAB_VALUE.indexOf("members")],
                    filterChoices: filterChoices,
                    locale: locale,
                  })}
                  locationInputRef={locationInputRefs[TYPES_BY_TAB_VALUE[TYPES_BY_TAB_VALUE.indexOf("members")]]}
                  locationOptionsOpen={locationOptionsOpen}
                  handleSetLocationOptionsOpen={handleSetLocationOptionsOpen}
                />
              )}

              {/*
                We have two loading spinner states: filtering, and fetching more data.
                When filtering, the spinner replaces the Previews components.
                When fetching more data, the spinner appears under the last row of the Previews components.
                Render the not found page if the object came back empty.
              */}
              {isFiltering ? (
                <LoadingSpinner />
              ) : state?.items?.members?.length ? (
                <ProfilePreviews
                  hasMore={state.hasMore.members}
                  loadFunc={loadMoreMembers}
                  parentHandlesGridItems
                  profiles={state.items.members}
                  showAdditionalInfo
                />
              ) : (
                <NoItemsFound type="members" />
              )}
            </TabContent>
          )}
          <TabContent
            value={tabValue}
            index={TYPES_BY_TAB_VALUE.indexOf("ideas")}
            className={classes.tabContent}
          >
            {isFiltering ? (
              <LoadingSpinner />
            ) : (
              <IdeasBoard
                hasMore={state.hasMore.ideas}
                loadFunc={loadMoreIdeas}
                ideas={state.items.ideas}
                allHubs={allHubs}
                userOrganizations={userOrganizations}
                onUpdateIdeaRating={handleUpdateIdeaRating}
                initialIdeaUrlSlug={initialIdeaUrlSlug}
                hubLocation={hubLocation}
                hubData={hubData}
              />
            )}
          </TabContent>
        </>
      </Container>
      <Tutorial
        fixedPosition
        pointerRefs={{
          projectCardRef: firstProjectCardRef,
          filterButtonRef: filterButtonRef,
          organizationsTabRef: organizationsTabRef,
          hubsSubHeaderRef: hubsSubHeaderRef,
          hubQuickInfoRef: hubQuickInfoRef,
          hubProjectsButtonRef: hubProjectsButtonRef,
        }}
        hubName={hubName}
        nextStepTriggeredBy={nextStepTriggeredBy}
      />
    </LoadingContext.Provider>
  );
}

function TabContent({ value, index, children }) {
  return <div hidden={value !== index}>{children}</div>;
}
