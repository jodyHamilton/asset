<?php if (count($items)) {
  foreach ($items as $delta => $item) {
    print render($item);
  }
}
