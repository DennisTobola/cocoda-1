<template>
  <div
    :style="`${noTree ? 'min-height: 50px; max-height: 50px;' : ''}`"
    class="conceptTree">
    <!-- Minimizer allows the component to get minimized -->
    <minimizer :text="$t('conceptTree.title')" />
    <!-- Show top concepts -->
    <div
      ref="conceptTreeItems"
      class="conceptTreeItems scrollable">
      <concept-tree-item
        v-for="({ concept, depth, isSelected }, index) in items"
        :key="index"
        :concept="concept"
        :depth="depth"
        :is-selected="isSelected"
        :index="index"
        :is-left="isLeft" />
    </div>
    <div
      v-if="noTree"
      class="fillAndCenter fontWeight-heavy">
      {{ $t("conceptTree.noTree") }}
    </div>
    <!-- Full screen loading indicator -->
    <loading-indicator-full v-if="loading || _topConcepts.includes(null)" />
  </div>
</template>

<script>
import LoadingIndicatorFull from "./LoadingIndicatorFull"
import ConceptTreeItem from "./ConceptTreeItem"
import Minimizer from "./Minimizer"
import _ from "lodash"
import { scroller } from "vue-scrollto/src/scrollTo"

// Import mixins
import objects from "../mixins/objects"

/**
 * Component that represents a (navigatable) concept tree.
 */
export default {
  name: "ConceptTree",
  components: {
    LoadingIndicatorFull, ConceptTreeItem, Minimizer
  },
  mixins: [objects],
  props: {
    /**
     * Tells the component on which side of the application it is.
     */
    isLeft: {
      type: Boolean,
      default: true
    }
  },
  data () {
    return {
      loading: false,
      currentSelectedConcept: null,
      shouldScroll: true,
      scrollTo: scroller(),
    }
  },
  computed: {
    schemeSelected() {
      return this.selected.scheme[this.isLeft]
    },
    conceptSelected() {
      return this.selected.concept[this.isLeft]
    },
    items() {
      let concepts = []
      for (let concept of this._topConcepts) {
        concepts.push(concept)
        let children = this.children(concept)
        concepts = concepts.concat(children)
      }
      let items = []
      for (let concept of concepts) {
        items.push({
          concept,
          depth: (concept && concept.ancestors && concept.ancestors.length) || 0,
          isSelected: this.$jskos.compare(this.conceptSelected, concept),
        })
      }
      return items
    },
    _topConcepts() {
      let uri = _.get(this.selected.scheme[this.isLeft], "uri", null)
      return _.get(this.topConcepts, uri)
    },
    noTree() {
      return this.items.length == 0 && !this.loading
    },
  },
  watch: {
    conceptSelected: {
      handler() {
        // TODO: Check
        let concept = this.conceptSelected
        if (concept != this.currentSelectedConcept) {
          this.currentSelectedConcept = concept
          this.shouldScroll = true
        }
        if (this.$jskos.isConcept(concept)) {
          // Check if concept is fully loaded
          if (concept.ancestors && !concept.ancestors.includes(null)) {
            let fullyLoaded = true
            for (let ancestor of concept.ancestors) {
              if (!ancestor.narrower || ancestor.narrower.includes(null)) {
                fullyLoaded = false
              }
            }
            if (fullyLoaded && this.shouldScroll) {
              this.shouldScroll = false
              // Open ancestors
              for (let ancestor of this.conceptSelected.ancestors) {
                this.open(ancestor, this.isLeft, true)
              }
              _.delay(() => {
                // Don't scroll if concept changed in the meantime
                if (this.shouldScroll) return
                let el = document.querySelectorAll(`[data-uri='${concept.uri}']`)[0]
                // Scroll element
                var options = {
                  container: this.$refs.conceptTreeItems,
                  easing: "ease-in",
                  offset: -50,
                  cancelable: true,
                  x: false,
                  y: true
                }
                if (el) this.scrollTo(el, 200, options)
                this.loading = false
              }, 100)
            } else if (!fullyLoaded) {
              this.loading = true
            }
          } else {
            this.loading = true
          }
        }
      },
      deep: true
    },
  },
  methods: {
    children(concept) {
      let items = []
      if (concept && concept.__ISOPEN__ && concept.__ISOPEN__[this.isLeft]) {
        for (let child of concept.narrower) {
          items.push(child)
          items = items.concat(this.children(child))
        }
      }
      return items
    },
  }
}

</script>

<style lang="less" scoped>
@import "../style/main.less";

.conceptTree {
  position: relative;
  overflow-y: hidden;
}
.conceptTreeNotLoading {
  padding: 2px 8px 2px 8px;
}
.concept {
  list-style-type: none;
  padding: 0;
  margin-bottom: 10px;
  margin-top: 10px;
  line-height: 1.2;
}
.concept > li {
  margin-left: 20px;
  margin-top: 10px;
  margin-bottom: 5px;
}
.conceptTreeItems {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
}
.conceptTreeItems {
  padding: 2px 0px;
}
</style>
