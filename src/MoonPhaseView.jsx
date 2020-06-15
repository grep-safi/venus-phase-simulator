import React from 'react';
import PropTypes from 'prop-types';
import * as PIXI from 'pixi.js';

export default class MoonPhaseView extends React.Component {
    constructor(props) {
        super(props);

        this.id = 'MoonPhaseView'
        this.moon = null;
        this.radius = 100.5;

        // width: 228, height: 215
        this.center = new PIXI.Point(228 / 2, 215 / 2);
    }
    render() {

        return (
            <div className="mt-1"
                 ref={(thisDiv) => {this.el = thisDiv;}} />
        );
    }

    componentDidMount() {
        const me = this;

        this.app = new PIXI.Application({
            width: this.center.x * 2,
            height: this.center.y * 2
        });
        this.el.appendChild(this.app.view);

        this.draw();
    }
    componentDidUpdate(prevProps) {
        if (prevProps.moonAngle !== this.props.moonAngle) {
            this.drawPhase(this.leftShade, this.rightShade,
                this.convertPhase(this.props.moonAngle));
        }
    }
    draw() {
        this.drawMoon(this.app);
        this.drawShades(this.app);
        this.drawPhase(this.leftShade, this.rightShade,
            this.convertPhase(this.props.moonAngle));
    }
    drawMoon(app) {
        const moon = new PIXI.Sprite(PIXI.Texture.from('img/grey-circle.png'));
        moon.width = 220;
        moon.height = 220;
        app.stage.addChild(moon);
    }
    drawShades(app) {
        this.leftShade = new PIXI.Graphics();
        // this.leftShade.pivot = this.center;
        this.leftShade.pivot = new PIXI.Point(this.center.x, this.center.y - 20);
        this.rightShade = new PIXI.Graphics();
        // this.rightShade.pivot = this.center;
        this.rightShade.pivot = new PIXI.Point(this.center.x, this.center.y - 20);

        this.leftShade.beginFill(0x000000, 0.7);
        this.leftShade.arc(this.center.x * 2, this.center.y * 2,
            this.radius, Math.PI / 2, -Math.PI / 2);
        this.leftShade.endFill();
        app.stage.addChild(this.leftShade);

        this.rightShade.beginFill(0x000000, 0.7);
        this.rightShade.arc(this.center.x * 2, this.center.y * 2,
            this.radius, -Math.PI / 2, Math.PI / 2);
        this.rightShade.endFill();
        app.stage.addChild(this.rightShade);

        // When the moon is a crescent, use the opposite shade to
        // create a mask, with only the shade part of the moon clearly
        // visible. So, sometimes there are actually two moons on the
        // screen, you just can't tell.
        // const hiddenMoon = new PIXI.Sprite(this.moon.texture);
        const hiddenMoon = new PIXI.Sprite(PIXI.Texture.from('img/grey-circle.png'));
        hiddenMoon.visible = false;
        hiddenMoon.width = 220;
        hiddenMoon.height = 220;
        app.stage.addChild(hiddenMoon);
        this.hiddenMoon = hiddenMoon;
    }
    drawPhase(leftShade, rightShade, phase) {
        // this.leftShade.clear();
        // this.leftShade.beginFill(0x000000, 0.7);
        // this.leftShade.arc(this.center.x * 2, this.center.y * 2,
        //     this.radius - 30, Math.PI / 2, -Math.PI / 2);
        // this.leftShade.endFill();
        //
        // this.rightShade.clear();
        // this.rightShade.beginFill(0x000000, 0.7);
        // this.rightShade.arc(this.center.x * 2, this.center.y * 2,
        //     this.radius - 30, -Math.PI / 2, Math.PI / 2);
        // this.rightShade.endFill();

        if (phase <= 0.5) {
            const scale = 1 - (phase * 4);
            leftShade.scale.x = 1;
            leftShade.position.x = 0;
            rightShade.scale.x = scale;
            rightShade.position.x = this.center.x - (scale * this.center.x);

            if (phase > 0.25) {
                this.hiddenMoon.mask = this.rightShade;
                this.hiddenMoon.visible = true;
            } else {
                this.hiddenMoon.mask = null;
                this.hiddenMoon.visible = false;
            }
        } else {
            const scale = -phase * 4 + 3;

            rightShade.scale.x = 1;
            rightShade.position.x = 0;

            if (phase < 0.75) {
                this.hiddenMoon.mask = this.leftShade;
                this.hiddenMoon.visible = true;
                leftShade.scale.x = -scale;
                leftShade.position.x = this.center.x - (-scale * this.center.x);
            } else {
                this.hiddenMoon.mask = null;
                this.hiddenMoon.visible = false;
                leftShade.scale.x = -scale;
                leftShade.position.x =  this.center.x - (-scale * this.center.x);
                rightShade.scale.x = 1;
                rightShade.position.x = 0;
            }
        }
    }
    /**
     * Get the moonPhase value that's used by the rest of the system
     * ready for the moon phase painter.
     *
     * moonPhase is offset by pi (its initial value is Math.PI, see
     * initial state in main.jsx), and also divide it by 2 * pi
     * because moonPhase is in radians and the moon phase painter
     * expects the phase to be a number between 0 and 1.
     */
    convertPhase(moonPhase) {
        // console.log(`monphase eh: ${(moonPhase)}`);
        const phase = (moonPhase - Math.PI) / (Math.PI * 2);
        if (phase > 1) {
            return 0;
        }
        if (phase < 0) {
            return phase + 1;
        }
        return phase;
    }
}

MoonPhaseView.propTypes = {
    moonAngle: PropTypes.number.isRequired,
};