$.fn.RangeSlider = function (cfg) {
  this.sliderCfg = {
    min: cfg && !isNaN(parseFloat(cfg.min)) ? Number(cfg.min) : null,
    max: cfg && !isNaN(parseFloat(cfg.max)) ? Number(cfg.max) : null,
    step: cfg && Number(cfg.step) ? cfg.step : 1,
    callback: cfg && cfg.callback ? cfg.callback : null
  };

  var $input = $(this);
  var $inputText = $(this).parents('.input-container-box').find('input.input-text');
  var $addInput = $(this).parents('.input-container-box').find('.add');
  var $descInput = $(this).parents('.input-container-box').find('.desc');
  var min = this.sliderCfg.min;
  var max = this.sliderCfg.max;
  var step = this.sliderCfg.step;
  var callback = this.sliderCfg.callback;
  var updateValue = function(value) {
    $input.val(value).css('background-size', value + '% 100%');
    $inputText.val(value)
    if ($.isFunction(callback)) {
      callback(this);
    }
  }

  // 设置初始值
  $input.attr('min', min)
    .attr('max', max)
    .attr('step', step);

  // 监听 input 事件，因为需要在滑动的时候就改变，而不是拖动结束之后再改变
  $input.bind('input', function (e) {
    updateValue(this.value)
  });

  // 文本框内容
  $inputText.bind('input', function (e) {
    var value = 0;
    if (/^[1-9][0-9]*/.test(this.value)) {
      value = this.value;
    }
    if (this.value > 100) {
      value = 100;
    }
    if (this.value < 0) {
      value = 0
    }
    updateValue(value)
  });

  // 增加事件
  $addInput.bind('click', function () {
    var value = $inputText.val();
    value++;
    if (value > 100) value = 100;
    updateValue(value)
  })

  // 减少事件
  $descInput.bind('click', function () {
    var value = $inputText.val();
    value--;
    if (value < 0) value = 0;
    updateValue(value)
  })


};