<template>
  <div
    v-if="concept != null"
    :style="`padding-left: ${depth * 10}px`"
    :data-uri="concept.uri"
    :class="{
      hovered: isHovered,
      selected: isSelected
    }"
    class="conceptTreeItem">
    <!-- Concept -->
    <div
      class="conceptBox"
      draggable="true"
      @dragstart="dragStart(concept, $event)"
      @dragend="dragEnd()">
      <div
        v-if="hasChildren"
        class="arrowBox"
        @click="openByArrow(!isOpen)">
        <i
          :class="{
            right: !isOpen,
            down: isOpen
          }" />
      </div>
      <router-link
        :to="url"
        :class="{ labelBoxFull: !hasChildren, labelBoxSelected: isSelected }"
        class="labelBox"
        @mouseover.native="hovering(concept)"
        @mouseout.native="hovering(null)"
        @click.native.stop.prevent="onClick">
        <item-name
          :item="concept"
          :is-highlighted="isSelected"
          :prevent-external-hover="true" />
      </router-link>
      <div
        v-show="canAddToMapping"
        v-b-tooltip.hover="{ title: $t('general.addToMapping'), delay: $util.delay.medium}"
        class="addToMapping"
        @click="addConcept()"
        @mouseover="hovering(concept)"
        @mouseout="hovering(null)">
        <font-awesome-icon icon="plus-circle" />
      </div>
    </div>
    <!-- Small loading indicator when loading narrower -->
    <loading-indicator
      v-show="hasChildren && isOpen && concept.narrower.includes(null)"
      size="sm"
      style="margin-left: 36px" />
  </div>
</template>

<script>
import LoadingIndicator from "./LoadingIndicator"
import ItemName from "./ItemName"
import _ from "lodash"

// Import mixins
import objects from "../mixins/objects"

/**
 * Component that represents one concept item in a ConceptTree and possibly its children.
 */
export default {
  name: "ConceptTreeItem",
  components: {
    LoadingIndicator, ItemName
  },
  mixins: [objects],
  props: {
    /**
     * The concept object that this tree item represents.
     */
    concept: {
      type: Object,
      default: null
    },
    /**
     * The depth of the current item.
     */
    depth: {
      type: Number,
      default: null
    },
    /**
     * The index of the current item.
     */
    index: {
      type: Number,
      default: null
    },
    /**
     * Tells the component on which side of the application it is.
     */
    isLeft: {
      type: Boolean,
      default: true
    },
    /**
     * Tells the component whether the item is selected.
     */
    isSelected: {
      type: Boolean,
      default: false
    },
  },
  data () {
    return {
      isHoveredFromHere: false,
      /** Determines whether to show loading indicator for narrower */
      loadingChildren: false,
      /** Prevent double clicks */
      preventClick: false,
      preventClickArrow: false,
      canAddToMapping: false,
      interval: null,
      /** URL of currently hovered concept */
      url: "",
    }
  },
  computed: {
    hasChildren() {
      return  _.get(this.concept, "narrower.length", 1) != 0
    },
    isHovered() {
      // return this.$jskos.compare(this.hoveredConcept, this.concept)
      return this.isHoveredFromHere
    },
    childrenLoaded() {
      return !this.concept.narrower || !this.concept.narrower.includes(null)
    },
    isOpen() {
      return _.get(this.concept, `__ISOPEN__[${this.isLeft}]`, false)
    },
  },
  methods: {
    /**
     * Triggers a hovered event.
     */
    hovering(concept) {
      this.hoveredConcept = concept
      this.isHoveredFromHere = concept != null
      // Set canAddToMapping
      this.canAddToMapping = this.$store.getters["mapping/canAdd"](this.concept, this.selected.scheme[this.isLeft], this.isLeft)
      // Check whether mouse is still in element.
      window.clearInterval(this.interval)
      if (concept != null) {
        this.interval = setInterval(() => {
          if (!this.isMouseOver()) {
            this.isHoveredFromHere = false
            window.clearInterval(this.interval)
          }
        }, 500)
      }
      // Set URL to router URL for this concept
      if (concept) {
        this.url = this.getRouterUrl(concept, this.isLeft)
      } else {
        this.url = ""
      }
    },
    /**
     * Calls open and prevents accidental double clicks.
     */
    openByArrow(isOpen) {
      if (this.preventClickArrow) {
        return
      }
      this.open(this.concept, this.isLeft, isOpen)
      this.loadChildren()
      this.preventClickArrow = true
      _.delay(() => {
        _.delay(() => {
          this.preventClickArrow = false
        }, 200)
      }, 50)
    },
    /**
     * Triggers a selected event.
     */
    select(concept) {
      // FIXME: Replace with $router.push.
      this.setSelected({ isLeft: this.isLeft, concept })
    },
    /**
     * Deals with a click on a concept.
     *
     * If the concept is not selected, select the concept.
     * If the concept is selected, toggle the open status.
     */
    onClick() {
      if (this.preventClick) {
        return
      }
      if (!this.isSelected) {
        // this.select(this.concept)
      } else if(this.hasChildren) {
        // This section tries to prevent accidental clicks by preventing double clicks when opening/closing a concept's children.
        this.preventClick = true
        _.delay(() => {
          this.open(this.concept, this.isLeft, !this.isOpen)
          _.delay(() => {
            this.preventClick = false
          }, 200)
        }, 50)
      }
    },
    /**
     * Clicked the plus icon to add a concept.
     */
    addConcept() {
      if (!this.isSelected && this.$settings.conceptTreeAddToMappingSelectsConcept) {
        this.select(this.concept)
      }
      this.addToMapping({
        concept: this.concept,
        scheme: this.selected.scheme[this.isLeft],
        isLeft: this.isLeft
      })
    },
    /**
     * Loads the concept's children.
     *
     * Scroll on finish.
     */
    loadChildren() {
      this.loadingChildren = true
      this.loadNarrower(this.concept).then(concept => {
        this.loadingChildren = false
        // Only scroll when concept is open
        if (concept.__ISOPEN__ && concept.__ISOPEN__[this.isLeft]) {
          this.scrollTo()
        }
      })
    },
    /**
     * Scrolls the concept further to the top.
     */
    scrollTo() {
      // Determine conceptTree element because it is the scrolling container
      let parent = this.$el.parentElement
      while (!parent.classList.contains("scrollable")) {
        parent = parent.parentElement
      }
      // Scroll element
      var options = {
        container: parent,
        easing: "ease-in",
        offset: -20,
        cancelable: true,
        x: false,
        y: true
      }
      this.$scrollTo(this.$el, 200, options)
    },
  }
}

</script>

<style lang="less" scoped>
@import "../style/main.less";

.conceptBox {
  display: flex;
  position: relative;
  min-height: 20px;
  padding-top: 1px;
  padding-bottom: 1px;
  margin: 3px;
  cursor: pointer;
  user-select: none;
}
.arrowBox {
  flex: none;
  width: 18px;
  padding-left: 4px;
}
.labelBox {
  flex: 1;
  vertical-align: center;
  padding-right: 12px;
}
.labelBoxSelected {
  padding-right: 4px;
}
.labelBoxFull {
  padding-left: 18px;
}
.addToMapping {
  .fontSize-large;
  position: absolute;
  color: @color-background;
  top: -1px;
  right: 0px;
  opacity: 0.7;
}

.addToMapping:hover {
  color: @color-action-1;
}
.hovered > .addToMapping {
  color: @color-action-2;
}

.hovered,
.selected.hovered,
.arrowBox:hover {
  background-color: @color-select-1;
  color: @color-action-2;
}

/* For arrows, from https://www.w3schools.com/howto/howto_css_arrows.asp */
// TODO: Use font awesome or move somewhere else
.arrowBox > i {
  border: solid black;
  border-width: 0 2px 2px 0;
  display: inline-block;
  padding: 3px;
  margin: 2px 0;
}
.right {
  transform: rotate(-45deg);
  -webkit-transform: rotate(-45deg);
}
.left {
  transform: rotate(135deg);
  -webkit-transform: rotate(135deg);
}
.up {
  transform: rotate(-135deg);
  -webkit-transform: rotate(-135deg);
}
.down {
  transform: rotate(45deg);
  -webkit-transform: rotate(45deg);
}
</style>
