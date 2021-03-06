<template>
  <div>
    <b-modal
      ref="mappingDetail"
      :title="$t('mappingDetail.title')"
      class="fontSize-normal"
      centered
      hide-footer
      no-enforce-focus
      size="lg">
      <div v-if="mapping">
        <b-container
          class="mappingDetail-container"
          fluid>
          <!-- Source Scheme -->
          <b-row>
            <b-col cols="3">
              {{ $t("mappingDetail.sourceScheme") }}:
            </b-col>
            <b-col>
              <item-name
                :draggable="false"
                :item="mapping.fromScheme" />
            </b-col>
          </b-row>
          <!-- Source Concepts -->
          <b-row>
            <b-col cols="3">
              {{ $tc("mappingDetail.sourceConcept", $jskos.conceptsOfMapping(mapping, 'from').length) }}:
            </b-col>
            <b-col>
              <p
                v-for="concept in $jskos.conceptsOfMapping(mapping, 'from')"
                :key="`mappingDetail-from-${concept.uri}`">
                <item-name
                  :draggable="false"
                  :item="concept" />
              </p>
            </b-col>
          </b-row>
          <!-- Target Scheme -->
          <b-row>
            <b-col cols="3">
              {{ $t("mappingDetail.targetScheme") }}:
            </b-col>
            <b-col>
              <item-name
                :draggable="false"
                :item="mapping.toScheme" />
            </b-col>
          </b-row>
          <!-- Target Concepts -->
          <b-row>
            <b-col cols="3">
              {{ $tc("mappingDetail.targetConcept", $jskos.conceptsOfMapping(mapping, 'to').length) }}:
            </b-col>
            <b-col>
              <p
                v-for="concept in $jskos.conceptsOfMapping(mapping, 'to')"
                :key="`mappingDetail-to-${concept.uri}`">
                <item-name
                  :draggable="false"
                  :item="concept" />
              </p>
            </b-col>
          </b-row>
          <!-- Mapping Type -->
          <b-row v-if="mapping.type && mapping.type.length">
            <b-col cols="3">
              {{ $t("mappingDetail.mappingType") }}:
            </b-col>
            <b-col>
              <a
                :href="$jskos.mappingTypeByType(mapping.type).uri"
                target="_blank">
                {{ $util.prefLabel($jskos.mappingTypeByType(mapping.type)) }} ({{ $util.notation($jskos.mappingTypeByType(mapping.type)) }})
              </a>
            </b-col>
          </b-row>
          <!-- Creator -->
          <b-row>
            <b-col cols="3">
              {{ $t("mappingDetail.creator") }}:
            </b-col>
            <b-col>
              <p
                v-for="(creator, index) in mapping.creator || []"
                :key="`mappingDetail-creator-${index}`">
                <auto-link
                  :link="creator.url || creator.uri"
                  :text="$util.prefLabel(creator)" />
              </p>
            </b-col>
          </b-row>
          <!-- Created -->
          <b-row>
            <b-col cols="3">
              {{ $t("mappingDetail.created") }}:
            </b-col>
            <b-col>{{ $util.dateToString(mapping.created) }}</b-col>
          </b-row>
          <!-- Modified -->
          <b-row>
            <b-col cols="3">
              {{ $t("mappingDetail.modified") }}:
            </b-col>
            <b-col>{{ $util.dateToString(mapping.modified) }}</b-col>
          </b-row>
          <!-- Annotations -->
          <b-row
            v-if="mapping.annotations && mapping.annotations.length"
            style="position: relative;">
            <b-col cols="3">
              {{ $t("mappingDetail.annotations") }}:
            </b-col>
            <b-col>
              <annotation-list :annotations="mapping.annotations" />
            </b-col>
            <div
              class="dataModalButton"
              @click="$refs.dataModalAnnotations.show()">
              <font-awesome-icon icon="code" />
            </div>
          </b-row>
          <!-- Note -->
          <b-row v-if="mapping.note">
            <b-col cols="3">
              {{ $t("mappingDetail.note") }}:
            </b-col>
            <b-col
              style="max-height: 200px; overflow: scroll;"
              v-html="($util.lmContent(mapping, 'note') || []).map(note => `<p>${note.split('\n').join('<br>')}</p>`).join('')" />
          </b-row>
          <!-- PartOf -->
          <b-row v-if="mapping.partOf">
            <b-col cols="3">
              {{ $t("mappingDetail.partOf") }}:
            </b-col>
            <b-col>
              <p
                v-for="(part, index) in mapping.partOf"
                :key="`mappingDetail-partOf-${index}`">
                <auto-link
                  :link="part.uri"
                  :text="$util.prefLabel(part)" />
              </p>
            </b-col>
          </b-row>
          <!-- Identifier -->
          <b-row v-if="mapping.identifier">
            <b-col cols="3">
              {{ $t("mappingDetail.identifier") }}:
            </b-col>
            <b-col>
              <p
                v-for="(identifier, index) in mapping.identifier"
                :key="`mappingDetail-identifier-${index}`">
                <auto-link :link="identifier" />
              </p>
            </b-col>
          </b-row>
        </b-container>
      </div>
      <div
        class="dataModalButton"
        @click="$refs.dataModal.show()">
        <font-awesome-icon icon="code" />
      </div>
    </b-modal>
    <data-modal
      v-if="mapping"
      ref="dataModal"
      :data="mapping"
      :url="mapping.uri"
      type="mapping" />
    <data-modal
      v-if="mapping && mapping.annotations && mapping.annotations.length"
      ref="dataModalAnnotations"
      :data="mapping.annotations"
      type="annotation" />
  </div>
</template>

<script>
import DataModal from "./DataModal"
import ItemName from "./ItemName"
import AutoLink from "./AutoLink"
import AnnotationList from "./AnnotationList"

/**
 * A component (bootstrap modal) that allows viewing and exporting JSKOS data.
 */
export default {
  name: "MappingDetail",
  components: { DataModal, ItemName, AutoLink, AnnotationList },
  props: {
    /**
     * Mapping object
     */
    mapping: {
      type: Object,
      default: null
    },

  },
  methods: {
    show() {
      this.$refs.mappingDetail.show()
    },
  }
}
</script>

<style lang="less" scoped>
@import "../style/main.less";

.mappingDetail-container > .row {
  margin-bottom: 10px;
}

.mappingDetail-container > .row > .col-3 {
  text-align: right;
}

.mappingDetail-container p {
  margin: 0 !important;
}

</style>
