import React from 'react';
import * as PIXI from 'pixi.js';
import PropTypes from 'prop-types';
import {radToDeg} from "./utils";

const WIDTH = 600;
const HEIGHT = 300;

const MAINVIEW_WIDTH = 600;
const MAINVIEW_HEIGHT = 460;

const getPlanetPos = function(radius, phase) {
    return new PIXI.Point(
        radius * Math.cos(-phase) + MAINVIEW_WIDTH,
        radius * Math.sin(-phase) + MAINVIEW_HEIGHT);
};

export default class ZodiacStrip extends React.Component {
    constructor(props) {
        super(props);

        this.center = new PIXI.Point(WIDTH / 2, HEIGHT / 2);
    }
    render() {
        return (
            <div className="ZodiacStrip"
                 ref={(thisDiv) => {this.el = thisDiv;}} />
        );
    }
    componentDidMount() {
        this.app = new PIXI.Application({
            width: WIDTH,
            height: HEIGHT,
            backgroundColor: 0x241B23,
            antialias: true,
        });

        this.el.appendChild(this.app.view);

        const stage = new PIXI.Container();
        this.app.stage.addChild(stage);

        this.targetPlanet = this.drawTargetPlanetZodiac();
        this.drawShades();
        this.drawPhase(this.leftShade, this.rightShade, this.convertPhase(0));
    }
    componentDidUpdate(prevProps) {
        if (prevProps !== this.props) this.animate();
    }
    drawTargetPlanetZodiac() {
        const size = 275;

        const targetPlanetContainer = new PIXI.Container();
        targetPlanetContainer.name = 'targetPlanetZodiac';
        targetPlanetContainer.position = new PIXI.Point(WIDTH / 2, HEIGHT / 2);

        const targetPlanetImage = new PIXI.Sprite(PIXI.Texture.from('img/grey-circle.png'));
        targetPlanetImage.anchor.set(0.5);
        targetPlanetImage.width = size;
        targetPlanetImage.height = size;
        targetPlanetContainer.addChild(targetPlanetImage);

        this.app.stage.addChild(targetPlanetContainer);

        return targetPlanetContainer;
    }
    getDistance(firstBody, secondBody) {
        let diffX = Math.pow((firstBody.x - secondBody.x), 2);
        let diffY = Math.pow((firstBody.y - secondBody.y), 2);

        return Math.sqrt(diffX + diffY);
    }
    getElongationAngle() {

        let observerPos = getPlanetPos(this.props.radiusObserverPlanet, this.props.observerPlanetAngle);
        let targetPos = getPlanetPos(this.props.radiusTargetPlanet, this.props.targetPlanetAngle);
        let sunPos = new PIXI.Point(0, 0);

        observerPos.x -= MAINVIEW_WIDTH;
        observerPos.y -= MAINVIEW_HEIGHT;
        observerPos.y *= -1;

        targetPos.x -= MAINVIEW_WIDTH;
        targetPos.y -= MAINVIEW_HEIGHT;
        targetPos.y *= -1;

        let targetPlanetAngle = Math.atan2(targetPos.y - observerPos.y, targetPos.x - observerPos.x);
        let sunAngle = Math.atan2(sunPos.y - observerPos.y, sunPos.x - observerPos.x);

        let holdSunAng = sunAngle;
        let holdTargetPlanetAng = targetPlanetAngle;

        if (-Math.PI < sunAngle && sunAngle < 0) {
            sunAngle += 2 * Math.PI;
        }

        if (-Math.PI < targetPlanetAngle && targetPlanetAngle < 0) {
            targetPlanetAngle += 2 * Math.PI;
        }

        let elongationAngle = targetPlanetAngle - sunAngle;

        if (elongationAngle < 0) {
            elongationAngle += 2 * Math.PI;
        }

        let propsElongAngle = elongationAngle;

        if (propsElongAngle > Math.PI) {
            let temp = propsElongAngle - Math.PI;
            propsElongAngle -= temp * 2;
        }

        let distObserverSun = this.props.radiusObserverPlanet;
        let distTargetSun = this.props.radiusTargetPlanet;
        let distObserverTarget = this.getDistance(observerPos, targetPos);

        let targetElongAng = this.getTargetElongAng(distObserverTarget, distTargetSun, distObserverSun);
        this.drawTargetPlanetSize(distObserverTarget, targetElongAng);

        this.props.updateAngles(holdSunAng, holdTargetPlanetAng, propsElongAngle);
    }
    getTargetElongAng(a, b, c) {
        let numerator = Math.pow(a, 2) + Math.pow(b, 2) - Math.pow(c, 2);
        let denominator = (2 * a * b);
        let val = numerator / denominator;
        if (val > 1) val = 1;
        if (val < -1) val = -1;
        let ans = Math.acos(val);
        if (!ans) ans = 0;
        return ans;
    }
    drawTargetPlanetSize(separationDistance, targetElongation) {
        const minPixelSize = 100;
        const maxPixelSize = 275;

        const minDist = Math.abs(this.props.radiusTargetPlanet - this.props.radiusObserverPlanet);
        const maxDist = this.props.radiusObserverPlanet + this.props.radiusTargetPlanet;

        const linearScale = (input) => maxPixelSize - ((input - minDist) / (maxDist - minDist)) * (maxPixelSize - minPixelSize);

        const targetPlanetSize = linearScale(separationDistance);
        this.targetPlanet.width = targetPlanetSize;
        this.targetPlanet.height = targetPlanetSize;

        // this.drawShades();
        this.hiddenTargetPlanet.visible = true;
        // console.log(`target elongation: ${radToDeg(targetElongation)}`);
        this.drawPhase(this.leftShade, this.rightShade, this.convertPhase(targetElongation), targetPlanetSize / 2);
    }

    animate() {
        this.getElongationAngle();
    }

    drawShades() {
        const size = 275;
        const radius = size / 2;

        this.leftShade = new PIXI.Graphics();
        this.leftShade.pivot = this.center;
        this.rightShade = new PIXI.Graphics();
        this.rightShade.pivot = this.center;

        this.leftShade.beginFill(0x000000, 0.7);
        this.leftShade.arc(this.center.x * 2, this.center.y * 2,
            radius, Math.PI / 2, -Math.PI / 2);
        this.leftShade.endFill();

        this.app.stage.addChild(this.leftShade);

        this.rightShade.beginFill(0x000000, 0.7);
        this.rightShade.arc(this.center.x * 2, this.center.y * 2,
            radius, -Math.PI / 2, Math.PI / 2);
        this.rightShade.endFill();

        this.app.stage.addChild(this.rightShade);

        const hiddenTargetPlanet = new PIXI.Sprite( PIXI.Texture.from('img/grey-circle.png') );
        hiddenTargetPlanet.anchor.set(0.5);
        hiddenTargetPlanet.width = size;
        hiddenTargetPlanet.height = size;
        hiddenTargetPlanet.visible = false;
        hiddenTargetPlanet.position = new PIXI.Point(WIDTH / 2, HEIGHT / 2);

        this.app.stage.addChild(hiddenTargetPlanet);
        this.hiddenTargetPlanet = hiddenTargetPlanet;
    }
    drawPhase(leftShade, rightShade, phase, radius) {

        this.leftShade.clear();
        this.leftShade.beginFill(0x000000, 0.7);
        this.leftShade.arc(this.center.x * 2, this.center.y * 2,
            radius, Math.PI / 2, -Math.PI / 2);
        this.leftShade.endFill();

        this.rightShade.clear();
        this.rightShade.beginFill(0x000000, 0.7);
        this.rightShade.arc(this.center.x * 2, this.center.y * 2,
            radius, -Math.PI / 2, Math.PI / 2);
        this.rightShade.endFill();

        this.hiddenTargetPlanet.width = radius * 2;
        this.hiddenTargetPlanet.height = radius * 2;

        if (phase <= 0.5) {
            const scale = 1 - (phase * 4);
            leftShade.scale.x = 1;
            leftShade.position.x = 0;
            rightShade.scale.x = scale;
            rightShade.position.x = this.center.x - (scale * this.center.x);

            if (phase > 0.25) {
                this.hiddenTargetPlanet.mask = this.rightShade;
                this.hiddenTargetPlanet.visible = true;
            } else {
                this.hiddenTargetPlanet.mask = null;
                this.hiddenTargetPlanet.visible = false;
            }
        } else {
            const scale = -phase * 4 + 3;

            rightShade.scale.x = 1;
            rightShade.position.x = 0;

            if (phase < 0.75) {
                this.hiddenTargetPlanet.mask = this.leftShade;
                this.hiddenTargetPlanet.visible = true;
                leftShade.scale.x = -scale;
                leftShade.position.x = this.center.x - (-scale * this.center.x);
            } else {
                this.hiddenTargetPlanet.mask = null;
                this.hiddenTargetPlanet.visible = false;
                leftShade.scale.x = -scale;
                leftShade.position.x =  this.center.x - (-scale * this.center.x);
                rightShade.scale.x = 1;
                rightShade.position.x = 0;
            }
        }
    }
    convertPhase(moonPhase) {
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

// These are all the parameters that MUST be passed
// Into ZodiacStrip by main.jsx
ZodiacStrip.propTypes = {
    radiusObserverPlanet: PropTypes.number.isRequired,
    observerPlanetAngle: PropTypes.number.isRequired,
    radiusTargetPlanet: PropTypes.number.isRequired,
    targetPlanetAngle: PropTypes.number.isRequired,

    updateAngles: PropTypes.func.isRequired
};
