import { render } from 'solid-js/web'
import '../../../apps/desktop/src/assets/styles/markdown.css'
import '../src/theme/styles.css'
import './styles.css'

import App from './App'

render(() => <App />, document.getElementById('root')!)
