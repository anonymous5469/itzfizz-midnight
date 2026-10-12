import { useLayoutEffect, useRef, useState } from 'react';
import MetricCard from './MetricCard';
import { metrics } from '../data/metrics';
import { carFrontRatio } from '../data/car';
import { setupHeroAnimation } from '../animation/heroAnimation';

const headline = 'WELCOME ITZFIZZ';

export default function HeroSection() {
  const root = useRef(null);
  const [assetFailed, setAssetFailed] = useState(false);

  useLayoutEffect(() => setupHeroAnimation(root.current), []);

  return (
    <section ref={root} className="hero-section" aria-labelledby="hero-title">
      <div className="hero-scene">
        <div className="route">
          <div className="trail" aria-hidden="true" />
          <h1 id="hero-title" className="headline" aria-label={headline}>
            <span className="headline-content" aria-hidden="true">
              {Array.from(headline, (letter, index) => (
                <span className="headline-char" key={index}>{letter === ' ' ? '\u00a0' : letter}</span>
              ))}
            </span>
          </h1>
          <div className="car" aria-hidden="true" style={{ '--car-front-ratio': carFrontRatio }}>
            {assetFailed
              ? <div className="car-fallback"><span /><i /><i /></div>
              : <img src={`${import.meta.env.BASE_URL}car.svg`} width="520" height="240" alt="" fetchpriority="high" onError={() => setAssetFailed(true)} />}
          </div>
        </div>
        <ul className="metrics" aria-label="Impact statistics">
          {metrics.map((metric, index) => <MetricCard key={metric.value} metric={metric} index={index} />)}
        </ul>
        <p className="scroll-hint" aria-hidden="true">SCROLL TO EXPLORE</p>
      </div>
    </section>
  );
}
