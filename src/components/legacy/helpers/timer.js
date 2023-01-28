const getEl = (el) => document.querySelector(el)
const getText = (el, txt) => el.textContent = `${txt}`

const ClockTimer = {
    start: (time) => {
        var self = this;
        let minutes, seconds;
            this.intervalo = setInterval(() => {
                minutes = parseInt(time / 60, 10);
                seconds = parseInt(time % 60, 10);
                minutes = minutes < 10 ? "0" + minutes : minutes;
                seconds = seconds < 10 ? "0" + seconds : seconds;
                getText(getEl('#Mtimer'), `Tempo Estimado 🕘 ${minutes}m ${seconds}s`);
                --time < 0 ? clearInterval(this.intervalo) : false
            }, 1000)
    },
    stop: () => {
            clearInterval(this.intervalo);
            getText(getEl('#Mtimer'), `--:--`);
    }
}
module.exports = ClockTimer;