import React from 'react';
import * as PIXI from 'pixi.js';
import PropTypes from 'prop-types';

const WIDTH = 600;
const HEIGHT = 400;

const getPlanetPos = function(radius, phase) {
    return new PIXI.Point(
        // these magic numbers come from this.orbitCenter
        radius * Math.cos(-phase) + 600,
        radius * Math.sin(-phase) + 460);
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

        me.shade = null;
        me.targetPlanetZodiacContainer = me.drawTargetPlanetZodiac();

        me.start();
    }

    drawTargetPlanetZodiac() {
        const size = 100;

        const targetPlanetContainer = new PIXI.Container();
        targetPlanetContainer.name = 'targetPlanetZodiac';
        targetPlanetContainer.position = new PIXI.Point(WIDTH / 2, HEIGHT / 2);

        const targetPlanetImage = new PIXI.Sprite(PIXI.Texture.from('img/grey-circle.png'));
        targetPlanetImage.anchor.set(0.5);
        targetPlanetImage.width = size;
        targetPlanetImage.height = size;
        targetPlanetContainer.addChild(targetPlanetImage);

        this.shade = new PIXI.Graphics();
        this.shade.beginFill(0x000000);
        this.shade.alpha = 0.7;
        this.shade.arc(
            WIDTH / 2,
            HEIGHT / 2,
            size - 16.0,
            -Math.PI / 2,
            Math.PI / 2);

        this.app.stage.addChild(targetPlanetContainer);
        this.app.stage.addChild(this.shade);

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

    getDistance(targetPos, observerPos) {
        let diffX = Math.pow((targetPos.x - observerPos.x), 2);
        let diffY = Math.pow((targetPos.y - observerPos.y), 2);

        return Math.pow((diffX + diffY), 0.5);
    }

    getElongationAngle() {
        let observerPos = getPlanetPos(this.props.radiusObserverPlanet, this.props.observerPlanetAngle);
        let targetPos = getPlanetPos(this.props.radiusTargetPlanet, this.props.targetPlanetAngle);
        let sunPos = new PIXI.Point(0, 0);

        observerPos.x -= 600;
        observerPos.y -= 460;

        observerPos.y *= -1;

        targetPos.x -= 600;
        targetPos.y -= 460;

        targetPos.y *= -1;
        let x = this.getDistance(observerPos, targetPos);
        let maxSize = 400;
        this.targetPlanetZodiacContainer.width = maxSize - x;
        this.targetPlanetZodiacContainer.height = maxSize - x;


        this.shade.clear();
        this.shade.beginFill(0x000000);
        this.shade.alpha = 0.7;
        this.shade.arc(
            WIDTH / 2,
            HEIGHT / 2,
            (100) - 16,
            -Math.PI / 2 - 0.3,
            Math.PI / 2 + 0.3);

        this.shade.alpha = 0.7;

        console.log(`xxx baby: ${x}`);

        let targetPlanetAngle = Math.atan2(targetPos.y - observerPos.y, targetPos.x - observerPos.x);
        let sunAngle = Math.atan2(sunPos.y - observerPos.y, sunPos.x - observerPos.x);

        this.targetPlanetLongitude = targetPlanetAngle;
        this.sunLongitude = sunAngle;

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

        this.props.updateAngles(holdSunAng, holdTargetPlanetAng, propsElongAngle);

        // return elongationAngle;
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
