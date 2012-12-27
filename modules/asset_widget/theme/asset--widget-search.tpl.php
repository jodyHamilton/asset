<?php
/**
 * @file
 * asset--widget-search.tpl.php
 *
 * Template for asset in widget-search view mode.
 */
?>
<div class="item-inner">
  <div class="pic <?php print "$asset->type order-$asset->aid"; ?><?php if (!empty($media_field_tooltip)) print ' tooltip-call'; ?>">
    <?php if (!empty($media_field)): ?>
      <?php print $media_field; ?>
    <?php else: ?>
      <span class="placeholder"></span>
    <?php endif; ?>
    <span class="ico"></span>
  </div>

  <div class="title">
    <?php print $title; ?>
  </div>

  <?php if (!empty($copyright)): ?>
    <div class="descrip">
      <?php print $copyright; ?>
    </div>
  <?php endif; ?>

  <?php if (!empty($description)): ?>
    <div class="descrip">
      <?php print $description; ?>
    </div>
  <?php endif; ?>

  <?php if (!empty($size)): ?>
    <div class="size sizes">
      <strong><?php print t('Size :'); ?></strong>
      <?php print $size; ?>
    </div>
  <?php endif; ?>
</div>
<?php print $buttons; ?>
<?php /* Render content for preview tooltip. */ ?>
<?php if (!empty($media_field_tooltip) || !empty($description)): ?>
  <div class="tooltips-container">
    <div class="tooltip tooltip-media order-<?php print $asset->aid; ?>">
      <div class="tooltip-inner">
        <span class="pointer"></span>
        <div class="<?php print $asset->type; ?> thumbnail inner-el">
          <?php if (!empty($media_field_tooltip)): ?>
            <?php print $media_field_tooltip; ?>
          <?php endif; ?>
        </div>
        <div class="title inner-el">
          <?php print $title; ?>
        </div>
        <?php if (!empty($description)): ?>
          <div class="descrip inner-el">
            <?php print $description; ?>
          </div>
        <?php endif; ?>
        <a href="javascript: void(0)" class="close" title="<?php print t('Close popup'); ?>"><?php print t('close'); ?></a>
      </div>
    </div>
  </div>
<?php endif; ?>
