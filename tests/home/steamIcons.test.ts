import { describe, expect, it } from 'vitest';
import { isDialogCheck, isPageControllerIcon, isStreamMenuClasses } from '../../src/home/steamIcons';

describe('isPageControllerIcon', () => {
    // The shape of Steam's game-page controller icon (its export name is minified and changes between Steam builds).
    const steam = 'function Ge(){return(0,n.jsx)("svg",{version:"1.1",id:"Layer_2",className:"SVGIcon_Button SVGIcon_BigPicture",viewBox:"0 0 256 256",children:(0,n.jsx)("path",{fill:"currentColor",d:"M213.771,68.659c-4.108-7.066"})})}';
    it("knows Steam's game-page controller icon by its class and path", () => {
        expect(isPageControllerIcon(steam)).toBe(true);
    });
    it('not another Big Picture icon, nor a long function that merely mentions both', () => {
        expect(isPageControllerIcon(steam.replace('M213.771,68.659', 'M10,10'))).toBe(false);
        expect(isPageControllerIcon(`${steam}${' '.repeat(5000)}`)).toBe(false);
    });
});

describe('isDialogCheck', () => {
    // Steam's tick in its "Play from" menu (an SVGIcon_DialogCheck with a blue gradient; minified export name).
    const steam = 'function le(e){let t=e.highlightColor||"#00ccff",r=e.color||"#2d73ff";return(0,n.jsx)("svg",{className:"SVGIcon_Button SVGIcon_DialogCheck"})}';
    it("knows Steam's dialog tick by its class", () => {
        expect(isDialogCheck(steam)).toBe(true);
        expect(isDialogCheck(steam.replace('DialogCheck', 'DialogClose'))).toBe(false);
        expect(isDialogCheck(`${steam}${' '.repeat(5000)}`)).toBe(false);
    });
});

describe('isStreamMenuClasses', () => {
    it("is Steam's Play-button class map with the \"Play from\" menu's classes", () => {
        expect(isStreamMenuClasses({ PlayButtonContainer: 'a', StreamingContextMenuItem: 'b', CheckContainer: 'c', StreamingTargetLabel: 'd' })).toBe(true);
        expect(isStreamMenuClasses({ PlayButtonContainer: 'a', CheckContainer: 'c' })).toBe(false);
        expect(isStreamMenuClasses(null)).toBe(false);
    });
});
