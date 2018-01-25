// ------- helper functions ------- //
const easeFunctions = {
  'ease-in': t => t * t,
  'ease-out': t => t * (2 - t),
  'ease-in-out': t => t < .5 ? 2 * t * t : -1 + (4 -2 * t) * t,
  'linear': t => t,
};

function getRandom(min: number, max: number): number {
  return Math.floor(
    Math.random() * (max - min + 1) + min,
  );
}

// ------- Animation ------- //
interface animationStep {
  step: number;
  fromT: number;
  toT: number;
  type: string;
  offset: number;
}

class Animation {
  private slotMachine: SlotMachine;

  public fps: number;
  private interval: number;

  public animationSteps: animationStep[];
  public animationStep: animationStep;

  public rAF: number;

  public now: number;
  public lastRenderTimestamp: number;
  public delta: number;

  public t: number;
  public timeout: number;
  public timeStep: number;

  public fin: boolean;

  constructor(slotMachine: SlotMachine, fps: number = 30) {
    this.slotMachine = slotMachine;

    this.fps = fps;
    this.interval = 1000/this.fps;

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

  render(timestamp: number): boolean {
    this.now = timestamp;
    this.delta = this.now - this.lastRenderTimestamp;

    if (this.delta > this.interval) {
      this.lastRenderTimestamp = this.now - (this.delta % this.interval);

      if (
        this.t < this.animationStep.toT &&
        this.animationStep.type !== 'linear'
      ) {
        this.t += 0.15;
      } else if (this.animationStep.type !== 'linear') {
        this.setNextAnimationStep();
      } else {
        if (this.t < 30) this.t += this.t * 0.8;
        if (!this.timeout) {
          this.timeout = window.setTimeout(
            () => this.fin = true,
            1000,
          );
        }
      }

      return true;
    }
    return false;
  }

  setNextAnimationStep() {
    this.animationStep = this.animationSteps[
      this.animationStep.step + 1
    ];

    if (!this.animationStep) this.resetAnimation();

    this.updateSlotsCoords();
    this.t = this.animationStep.fromT;
  }

  updateSlotsCoords() {
    this.slotMachine.slotItems.forEach((slot, i) => {
      const reelY: number = i % this.slotMachine.columnsLength;

      slot.fromY = slot.curretnY;
      slot.toY = this.fin
      ? this.slotMachine.defaultSlotsY[reelY] + 10
      : slot.fromY + this.animationStep.offset;
    });

    if (this.fin) this.fin = false;
  }

  resetAnimation() {
    window.cancelAnimationFrame(this.rAF);
    this.t = 0;
    this.timeout = 0;
    this.timeStep = 0;
    this.fin = false;
    this.animationStep = this.animationSteps[0];
  }
}

// ------- SlotMachine ------- //
interface sizes {
  slotImgWidth: number;
  slotImgHeight: number;
  hotizontalSlotIndent: number;
  verticalSlotIndent: number;
  slotWidth: number;
  slotHeight: number;
  hotizontalSlotsAreaIndent: number;
  verticalSlotsAreaIndent: number;
}

interface slotItem {
  x: number;
  fromY: number;
  toY: number;
  curretnY: number;
  img: HTMLImageElement;
}

class SlotMachine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private background: HTMLImageElement;
  private slotNodes: NodeListOf<HTMLImageElement>;

  private startSpinBtn: HTMLElement;

  private rowsLength: number;
  public columnsLength: number;
  private hidenRowsLength: number;

  public sizes: sizes;

  public slotItems: slotItem[];
  public slotItemsPlaceholder: string[];

  public defaultSlotsY: number[];

  private anim: Animation;

  private lastHiddenRowIndex: number;
  private firstHiddenRowIndex: number;

  constructor() {
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

    this.sizes.hotizontalSlotsAreaIndent = (
      this.canvas.width -
      this.sizes.slotWidth *
      this.rowsLength
    ) / 2;

    this.sizes.verticalSlotsAreaIndent = (
      this.canvas.height -
      this.sizes.slotHeight *
      (this.columnsLength - this.hidenRowsLength)
    ) / 2;

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

  addListeners() {
    [].forEach.call(
      this.slotNodes,
      slot => slot.addEventListener(
        'load',
        () => this.init(),
      ),
    );

    this.background.addEventListener(
      'load',
      () => this.init(),
    );

    this.startSpinBtn.addEventListener(
      'click',
      () => this.startSpin(),
    );
  }

  init() {
    this.renderBackground();

    this.slotItemsPlaceholder.forEach((slot, i) => {
      const reelX: number = Math.floor(i / this.columnsLength);
      const reelY: number = i % this.columnsLength;

      const x: number = this.sizes.hotizontalSlotsAreaIndent +
        (reelX * this.sizes.slotWidth) +
        this.sizes.hotizontalSlotIndent / 2;

      const y: number = this.sizes.verticalSlotsAreaIndent +
        (reelY - this.hidenRowsLength) *
        this.sizes.slotHeight +
        this.sizes.verticalSlotIndent / 2;

      this.defaultSlotsY[reelY] = y;

      if (!this.slotItems[i]) {
        const nextImgIndex: number = getRandom(
          0,
          this.slotNodes.length - 1,
        );

        if (this.slotNodes[nextImgIndex].complete) {
          this.slotItems[i] = {
            x,
            fromY: y,
            toY: y + this.anim.animationStep.offset,
            curretnY: y,
            img: this.slotNodes[nextImgIndex],
          };
        }
      }
    });

    this.slotItems.forEach((slot, i) => {
      if (typeof slot !== 'string') {
        this.ctx.drawImage(
          slot.img,
          slot.x,
          slot.curretnY,
          this.sizes.slotImgWidth,
          this.sizes.slotImgHeight,
        );
      }
    });

    this.renderSlotsFrame();
  }

  startSpin() {
    this.anim.rAF = window.requestAnimationFrame(
      () => this.startSpin(),
    );

    if (this.anim.render(Date.now())) {
      this.ctx.save();
      this.ctx.globalAlpha = this.anim.animationStep.type === 'linear' ? 0.65 : 1;
      this.renderBackground();
      this.ctx.restore();

      this.slotItems.forEach((slot, i) => {
        const nextY: number = slot.fromY +
          (slot.toY - slot.fromY) *
          easeFunctions[this.anim.animationStep.type](this.anim.t);

        this.anim.timeStep = this.anim.animationStep.type === 'linear'
          ? this.anim.timeStep
          : nextY - slot.curretnY;

        slot.curretnY = this.anim.animationStep.type === 'linear'
          ? slot.curretnY + this.anim.timeStep + this.anim.t
          : nextY;

        this.ctx.drawImage(
          slot.img,
          slot.x,
          slot.curretnY,
          this.sizes.slotImgWidth,
          this.sizes.slotImgHeight,
        );
      });

      if (
        this.slotItems[this.firstHiddenRowIndex].curretnY >
        -this.sizes.slotHeight
      ) {
        this.lastHiddenRowIndex = this.firstHiddenRowIndex  === 0
          ? 4
          : this.firstHiddenRowIndex - 1;

        this.slotItems.forEach((innerItem, j) => {
          if (j % this.columnsLength === this.lastHiddenRowIndex) {
            innerItem.img = this.slotNodes[getRandom(0, this.slotNodes.length - 1)];

            innerItem.curretnY = this.slotItems[this.firstHiddenRowIndex].curretnY -
              this.sizes.slotHeight;
          }
        });

        this.firstHiddenRowIndex = this.lastHiddenRowIndex;
        if (this.anim.fin) this.anim.setNextAnimationStep();
      }

      this.renderSlotsFrame();
    }
  }

  renderBackground() {
    this.ctx.drawImage(
      this.background,
      0,
      0,
      this.canvas.width,
      this.canvas.height,
    );
  }

  renderSlotsFrame() {
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'destination-atop';
    this.ctx.fillStyle = 'black';
    this.ctx.fillRect(
      this.sizes.hotizontalSlotsAreaIndent,
      this.sizes.verticalSlotsAreaIndent,
      this.canvas.width -
      this.sizes.hotizontalSlotsAreaIndent,
      this.canvas.height -
      this.sizes.verticalSlotsAreaIndent,
    );
    this.ctx.restore();
  }
}

const slotMachine: SlotMachine = new SlotMachine();
slotMachine.addListeners();
