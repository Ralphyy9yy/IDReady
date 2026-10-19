const tips = ['Face the camera', 'Use even lighting', 'Keep head and shoulders visible', 'Avoid strong shadows']

export function PhotoTips() {
  const list = <ul>{tips.map(tip => <li key={tip}>{tip}</li>)}</ul>
  return <>
    <div className="guidance desktop-photo-tips"><h2>For a better result</h2>{list}</div>
    <details className="guidance mobile-photo-tips"><summary>Tips for a better photo</summary>{list}</details>
  </>
}
