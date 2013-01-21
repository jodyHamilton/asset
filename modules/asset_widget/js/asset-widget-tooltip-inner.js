/**
 * Asset search widget tooltip related JS actions.
 */

/**
 * Behaviour needed for passing iframe size to parent window function.
 */
(function ($) {
  Drupal.behaviors.assetsWidgetTooltipResize = {
    attach:function (context) {
       var $context = $(context);

      // Hack, set wrapper height to object height.
      // It's needed because FF can't calculate proper height() in case of video asset.
      var $object = $context.find('object');
      if ($object.size()) {
        $object.parent().height($object.height());
      }

      // Get size of loaded frame.
      var frameWidth = $context.find('.tooltip-iframe-body-element').width();
      var frameHeight = $context.find('.tooltip-iframe-body-element').height();

      // Resize tooltip.
      if (parent && parent.assetWidget) {
        parent.assetWidget.tooltipsPositionCalc(frameWidth, frameHeight);
      }
    }
  }
})(jQuery);
