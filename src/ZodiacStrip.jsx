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
        // these magic numbers come from this.orbitCenter
        radius * Math.cos(-phase) + MAINVIEW_WIDTH,
        radius * Math.sin(-phase) + MAINVIEW_HEIGHT);
};

export default class ZodiacStrip extends React.Component {
    constructor(props) {
        super(props);

        this.start = this.start.bind(this);
        this.stop = this.stop.bind(this);
        this.animate = this.animate.bind(this);
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

        const me = this;
        const stage = new PIXI.Container();
        this.app.stage.addChild(stage);

        me.leftShade = null;
        me.targetPlanetZodiacContainer = me.drawTargetPlanetZodiac();

        me.start();
    }

    drawTargetPlanetZodiac() {
        const size = 200;

        const targetPlanetContainer = new PIXI.Container();
        targetPlanetContainer.name = 'targetPlanetZodiac';
        targetPlanetContainer.position = new PIXI.Point(WIDTH / 2, HEIGHT / 2);

        const targetPlanetImage = new PIXI.Sprite(PIXI.Texture.from('img/grey-circle.png'));
        targetPlanetImage.anchor.set(0.5);
        targetPlanetImage.width = size;
        targetPlanetImage.height = size;
        targetPlanetContainer.addChild(targetPlanetImage);

        this.leftShade = new PIXI.Graphics();

        this.app.stage.addChild(targetPlanetContainer);
        this.app.stage.addChild(this.leftShade);

        return targetPlanetContainer;
    }

    componentWillUnmount() {
        this.app.stop();
    }

    start() {
        if (!this.frameId) {
            this.frameId = requestAnimationFrame(this.animate);
        }
    }

    stop() {
        cancelAnimationFrame(this.frameId);
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
        this.drawMoonPhase(distObserverTarget, targetElongAng);

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

    drawMoonPhase(separationDistance, targetElongation) {
        const minPixelSize = 100;
        const maxPixelSize = 275;

        const minDist = Math.abs(this.props.radiusTargetPlanet - this.props.radiusObserverPlanet);
        const maxDist = this.props.radiusObserverPlanet + this.props.radiusTargetPlanet;

        const linearScale = (input) => maxPixelSize - ((input - minDist) / (maxDist - minDist)) * (maxPixelSize - minPixelSize);

        const targetPlanetSize = linearScale(separationDistance);
        this.targetPlanetZodiacContainer.width = targetPlanetSize;
        this.targetPlanetZodiacContainer.height = targetPlanetSize;

        this.drawShade(targetPlanetSize / 2, targetElongation);
    }

    drawShade(radius, angle) {
        this.leftShade.clear();
        this.leftShade.pivot = new PIXI.Point(0, 0);
        this.leftShade.beginFill(0x000000);
        this.leftShade.alpha = 0.7;
        let shift = -0.5;
        this.leftShade.arc(
            // (1 / Math.pow(shift, 2)) * (WIDTH / 2),
            WIDTH / 2,
            HEIGHT / 2,
            radius,
            -Math.PI / 2,
            Math.PI / 2);

        this.leftShade.scale.x = shift;
        this.leftShade.position.x = ((WIDTH / 2) - (shift * (WIDTH / 2)));


        let s = 1;
        // this.targetPlanetZodiacContainer.scale.x = s;
    }

    animate() {
        this.getElongationAngle();
        // this.targetPlanetZodiacContainer.width -= 1;
        // this.targetPlanetZodiacContainer.height -= 1;

        this.frameId = requestAnimationFrame(this.animate);
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
