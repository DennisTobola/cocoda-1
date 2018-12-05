import router from "../router"
import jskos from "jskos-tools"

/**
 * Plugin that performs operations when a concept was selected.
 */
const selectedPlugin = store => {
  store.subscribe((mutation, state) => {
    // Check for selecting a concept
    let isLeft = _.get(mutation, "payload.isLeft")
    if (mutation.type == "selected/set") {
      let noQueryRefresh = mutation.payload && mutation.payload.noQueryRefresh
      if (mutation.payload.kind == "concept" || mutation.payload.kind == "both") {
        let concept = mutation.payload.value || mutation.payload.concept
        if (!concept) {
          store.commit({
            type: "alerts/add",
            text: "The selected concept could not be loaded.",
            variant: "warning",
          })
          return
        }
        let conceptInStore,
          scheme = concept.inScheme ? concept.inScheme[0] : null

        // Set scheme if a concept is selected without the scheme
        if (state.selected.scheme[isLeft] == null) {
          let schemeInStore = store.getters["objects/get"](scheme)
          store.commit({
            type: "selected/set",
            kind: "scheme",
            isLeft: isLeft,
            value: schemeInStore,
            noQueryRefresh
          })
        }

        // Check if concept is already in store and if not, load its data and set selected to that
        if (!concept.INSTORE) {
          conceptInStore = store.getters["objects/get"](concept)
          if (!conceptInStore) {
            store.dispatch({
              type: "objects/load",
              object: concept,
              scheme: scheme
            }).then(concept => {
              store.commit({
                type: "selected/set",
                kind: "concept",
                isLeft: isLeft,
                value: concept,
                noQueryRefresh
              })
            })
          } else {
            store.commit({
              type: "selected/set",
              kind: "concept",
              isLeft: isLeft,
              value: conceptInStore,
              noQueryRefresh
            })
          }
        } else {
          // TODO: Make sure this is canceled when there's a new request
          // Load concept's ancestors and their children
          store.dispatch({
            type: "objects/ancestors",
            object: concept
          }).then(concept => {
            if (concept == null) return
            // Load children for all ancestors
            let promises = [Promise.resolve(concept)]
            for (let ancestor of concept.ancestors || []) {
              promises.push(store.dispatch({
                type: "objects/narrower",
                object: ancestor
              }))
            }
            // If children were loaded before ancestors, then the children's ancestors property is set to [null]
            if (concept.narrower && !concept.narrower.includes(null)) {
              for (let child of concept.narrower || []) {
                store.commit({
                  type: "objects/set",
                  object: child,
                  prop: "ancestors",
                  value: concept.ancestors.concat([concept])
                })
              }
            }
            return Promise.all(promises)
          })
        }
      }
    }
    if (_.get(mutation, "payload.kind") == "scheme") {
      if (!isLeft) {
        // When changing scheme on right side AND the mapping is empty on the right side, set mapping's toScheme.
        if (store.getters["mapping/getConcepts"](isLeft).length == 0) {
          store.commit({
            type: "mapping/setScheme",
            isLeft,
            scheme: mutation.payload.value
          })
        }
      }
    }
  })
}

/**
 * Plugin that recalculates the mapping identifier for the current mapping on each change.
 */
const mappingIdentifierPlugin = store => {
  store.subscribe((mutation) => {
    // Check for selecting a concept
    if (mutation.type.startsWith("mapping") && !mutation.type.endsWith("setIdentifier")) {
      store.commit("mapping/setIdentifier")
    }
  })
}

/**
 * Helper function that refreshes the router with the current mapping and selected concepts/schemes.
 */
const refreshRouter = (store) => {
  // Add selected schemes and concepts
  let kinds = ["scheme", "concept"]
  let sides = { true: "from", false: "to" }
  let query = {}
  for (let kind of kinds) {
    for (let isLeft of [true, false]) {
      let key = sides[isLeft] + (kind == "scheme" ? "Scheme" : "")
      let object = store.state.selected[kind][isLeft]
      if (object && object.uri) {
        query[key] = object.uri
      }
    }
  }
  // Add mapping if either fromScheme or toScheme exists
  if (store.state.mapping.mapping.fromScheme || store.state.mapping.mapping.toScheme) {
    query.mapping = JSON.stringify(jskos.minifyMapping(store.state.mapping.mapping))
    // If an original mapping exists for the current mapping, save its identifier as well
    if (store.state.mapping.original) {
      query.identifier = store.state.mapping.original.identifier.find(id => id.startsWith("urn:jskos:mapping:content:"))
    }
  }
  // Push route
  router.push({ query })
}

/**
 * Plugin that sets URL parameters after selected scheme/concept/mapping changed.
 */
const routerParamPlugin = store => {
  store.subscribe(mutation => {
    const mutationTypes = [
      "selected/clear",
      "selected/set",
      "mapping/add",
      "mapping/remove",
      "mapping/removeAll",
      "mapping/set",
      "mapping/setType",
      "mapping/switch",
      "mapping/empty",
    ]
    if (mutationTypes.includes(mutation.type)) {
      if (mutation.payload && mutation.payload.noQueryRefresh) {
        return
      }
      refreshRouter(store)
    }
  })
}

let plugins = [selectedPlugin, mappingIdentifierPlugin, routerParamPlugin]
export { plugins, refreshRouter }
