// ------- helper functions ------- //
var easeFunctions = {
    'ease-in': function (t) { return t * t; },
    'ease-out': function (t) { return t * (2 - t); },
    'ease-in-out': function (t) { return t < .5 ? 2 * t * t : -1 + (4 - 2 * t) * t; },
    'linear': function (t) { return t; }
};
function getRandom(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}
var Animation = /** @class */ (function () {
    function Animation(slotMachine, fps) {
        if (fps === void 0) { fps = 30; }
        this.slotMachine = slotMachine;
        this.fps = fps;
        this.interval = 1000 / this.fps;
        this.animationSteps = [
            { step: 0, fromT: 0, toT: 1, type: 'ease-in-out', offset: -35 },
            { step: 1, fromT: 0, toT: 0.5, type: 'ease-in', offset: 80 },
            { step: 2, fromT: 2, toT: 1, type: 'linear', offset: 80 },
            { step: 3, fromT: 0.5, toT: 1, type: 'ease-out', offset: 0 },
            { step: 4, fromT: 0, toT: 1, type: 'ease-in-out', offset: -10 },
        ];
        this.animationStep = this.animationSteps[0];
        this.rAF; // requestAnimationFrame
        // ------- time ------- //
        this.now;
        this.lastRenderTimestamp = Date.now();
        this.delta;
        this.t = 0;
        this.timeout = 0;
        this.timeStep = 0;
        this.fin = false;
    }
    Animation.prototype.render = function (timestamp) {
        var _this = this;
        this.now = timestamp;
        this.delta = this.now - this.lastRenderTimestamp;
        if (this.delta > this.interval) {
            this.lastRenderTimestamp = this.now - (this.delta % this.interval);
            if (this.t < this.animationStep.toT &&
                this.animationStep.type !== 'linear') {
                this.t += 0.15;
            }
            else if (this.animationStep.type !== 'linear') {
                this.setNextAnimationStep();
            }
            else {
                if (this.t < 30)
                    this.t += this.t * 0.8;
                if (!this.timeout) {
                    this.timeout = window.setTimeout(function () { return _this.fin = true; }, 1000);
                }
            }
            return true;
        }
        return false;
    };
    Animation.prototype.setNextAnimationStep = function () {
        this.animationStep = this.animationSteps[this.animationStep.step + 1];
        if (!this.animationStep)
            this.resetAnimation();
        this.updateSlotsCoords();
        this.t = this.animationStep.fromT;
    };
    Animation.prototype.updateSlotsCoords = function () {
        var _this = this;
        this.slotMachine.slotItems.forEach(function (slot, i) {
            var reelY = i % _this.slotMachine.columnsLength;
            slot.fromY = slot.curretnY;
            slot.toY = _this.fin
                ? _this.slotMachine.defaultSlotsY[reelY] + 10
                : slot.fromY + _this.animationStep.offset;
        });
        if (this.fin)
            this.fin = false;
    };
    Animation.prototype.resetAnimation = function () {
        window.cancelAnimationFrame(this.rAF);
        this.t = 0;
        this.timeout = 0;
        this.timeStep = 0;
        this.fin = false;
        this.animationStep = this.animationSteps[0];
    };
    return Animation;
}());
var SlotMachine = /** @class */ (function () {
    function SlotMachine() {
        // ------- nodes ------- //
        this.canvas = document.querySelector('canvas#canvas');
        this.ctx = this.canvas.getContext('2d');
        this.background = document.querySelector('img#bg');
        this.slotNodes = document.querySelectorAll('.slot');
        this.startSpinBtn = document.getElementById('spinBtn');
        // ------- sizes ------- //
        this.rowsLength = 5;
        this.columnsLength = 5;
        this.hidenRowsLength = 2;
        this.sizes = {};
        this.sizes.slotImgWidth = 120;
        this.sizes.slotImgHeight = 124;
        this.sizes.hotizontalSlotIndent = 60;
        this.sizes.verticalSlotIndent = 32;
        this.sizes.slotWidth = this.sizes.slotImgWidth +
            this.sizes.hotizontalSlotIndent;
        this.sizes.slotHeight = this.sizes.slotImgHeight +
            this.sizes.verticalSlotIndent;
        this.sizes.hotizontalSlotsAreaIndent = (this.canvas.width -
            this.sizes.slotWidth *
                this.rowsLength) / 2;
        this.sizes.verticalSlotsAreaIndent = (this.canvas.height -
            this.sizes.slotHeight *
                (this.columnsLength - this.hidenRowsLength)) / 2;
        // ------- slots ------- //
        this.slotItems = [];
        this.slotItemsPlaceholder = Array
            .from('.........................'); // 25
        this.defaultSlotsY = [0, 0, 0, 0, 0];
        // ------- Animation instance ------- //
        this.anim = new Animation(this);
        this.lastHiddenRowIndex = 0;
        this.firstHiddenRowIndex = 0;
        this.startSpin = this.startSpin.bind(this);
    }
    SlotMachine.prototype.addListeners = function () {
        var _this = this;
        [].forEach.call(this.slotNodes, function (slot) { return slot.addEventListener('load', function () { return _this.init(); }); });
        this.background.addEventListener('load', function () { return _this.init(); });
        this.startSpinBtn.addEventListener('click', function () { return _this.startSpin(); });
    };
    SlotMachine.prototype.init = function () {
        var _this = this;
        this.renderBackground();
        this.slotItemsPlaceholder.forEach(function (slot, i) {
            var reelX = Math.floor(i / _this.columnsLength);
            var reelY = i % _this.columnsLength;
            var x = _this.sizes.hotizontalSlotsAreaIndent +
                (reelX * _this.sizes.slotWidth) +
                _this.sizes.hotizontalSlotIndent / 2;
            var y = _this.sizes.verticalSlotsAreaIndent +
                (reelY - _this.hidenRowsLength) *
                    _this.sizes.slotHeight +
                _this.sizes.verticalSlotIndent / 2;
            _this.defaultSlotsY[reelY] = y;
            if (!_this.slotItems[i]) {
                var nextImgIndex = getRandom(0, _this.slotNodes.length - 1);
                if (_this.slotNodes[nextImgIndex].complete) {
                    _this.slotItems[i] = {
                        x: x,
                        fromY: y,
                        toY: y + _this.anim.animationStep.offset,
                        curretnY: y,
                        img: _this.slotNodes[nextImgIndex]
                    };
                }
            }
        });
        this.slotItems.forEach(function (slot, i) {
            if (typeof slot !== 'string') {
                _this.ctx.drawImage(slot.img, slot.x, slot.curretnY, _this.sizes.slotImgWidth, _this.sizes.slotImgHeight);
            }
        });
        this.renderSlotsFrame();
    };
    SlotMachine.prototype.startSpin = function () {
        var _this = this;
        this.anim.rAF = window.requestAnimationFrame(function () { return _this.startSpin(); });
        if (this.anim.render(Date.now())) {
            this.ctx.save();
            this.ctx.globalAlpha = this.anim.animationStep.type === 'linear' ? 0.65 : 1;
            this.renderBackground();
            this.ctx.restore();
            this.slotItems.forEach(function (slot, i) {
                var nextY = slot.fromY +
                    (slot.toY - slot.fromY) *
                        easeFunctions[_this.anim.animationStep.type](_this.anim.t);
                _this.anim.timeStep = _this.anim.animationStep.type === 'linear'
                    ? _this.anim.timeStep
                    : nextY - slot.curretnY;
                slot.curretnY = _this.anim.animationStep.type === 'linear'
                    ? slot.curretnY + _this.anim.timeStep + _this.anim.t
                    : nextY;
                _this.ctx.drawImage(slot.img, slot.x, slot.curretnY, _this.sizes.slotImgWidth, _this.sizes.slotImgHeight);
            });
            if (this.slotItems[this.firstHiddenRowIndex].curretnY >
                -this.sizes.slotHeight) {
                this.lastHiddenRowIndex = this.firstHiddenRowIndex === 0
                    ? 4
                    : this.firstHiddenRowIndex - 1;
                this.slotItems.forEach(function (innerItem, j) {
                    if (j % _this.columnsLength === _this.lastHiddenRowIndex) {
                        innerItem.img = _this.slotNodes[getRandom(0, _this.slotNodes.length - 1)];
                        innerItem.curretnY = _this.slotItems[_this.firstHiddenRowIndex].curretnY -
                            _this.sizes.slotHeight;
                    }
                });
                this.firstHiddenRowIndex = this.lastHiddenRowIndex;
                if (this.anim.fin)
                    this.anim.setNextAnimationStep();
            }
            this.renderSlotsFrame();
        }
    };
    SlotMachine.prototype.renderBackground = function () {
        this.ctx.drawImage(this.background, 0, 0, this.canvas.width, this.canvas.height);
    };
    SlotMachine.prototype.renderSlotsFrame = function () {
        this.ctx.save();
        this.ctx.globalCompositeOperation = 'destination-atop';
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(this.sizes.hotizontalSlotsAreaIndent, this.sizes.verticalSlotsAreaIndent, this.canvas.width -
            this.sizes.hotizontalSlotsAreaIndent, this.canvas.height -
            this.sizes.verticalSlotsAreaIndent);
        this.ctx.restore();
    };
    return SlotMachine;
}());
var slotMachine = new SlotMachine();
slotMachine.addListeners();
