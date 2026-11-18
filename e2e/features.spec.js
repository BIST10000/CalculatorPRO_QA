import {test,expect} from '@playwright/test';
import fs from 'node:fs';

test('strict domain, curve labels, bounded paths and fullscreen magnifier',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');
 await page.getByLabel('u5 начало',{exact:true}).fill('0');
 await page.getByRole('button',{name:'Рассчитать →'}).click();await expect(page.getByRole('alert')).toContainText('больше 0');
 await page.locator('#preset').selectOption('comparison');await page.getByRole('button',{name:'Рассчитать →'}).click();
 const chart=page.locator('section.card').filter({has:page.getByRole('heading',{name:'Характеристики во времени',exact:true})});
 await expect(chart.locator('.curve-labels text')).toHaveCount(6);
 const labelText=await chart.locator('.curve-labels text').allTextContents();expect(labelText.some(t=>t.includes('u(5)'))).toBeTruthy();
 const ys=await chart.locator('g[data-series] polyline').evaluateAll(lines=>lines.flatMap(line=>line.getAttribute('points').split(' ').map(p=>Number(p.split(',')[1]))));
 expect(ys.length).toBeGreaterThan(0);expect(ys.every(y=>y>=28&&y<408)).toBeTruthy();
 await expect(chart).toContainText('0 (не вкл.)');
 await expect(page.getByRole('row').filter({hasText:'сопровождаемость'}).first()).toContainText('5,048396');
 const trigger=page.getByRole('button',{name:'Увеличить график: Изменение характеристик',exact:true});
 await trigger.click();const dialog=page.getByRole('dialog',{name:'Увеличенный график: Изменение характеристик'});await expect(dialog).toBeVisible();
 await dialog.getByRole('button',{name:'Увеличить масштаб',exact:true}).click();await expect(dialog.getByText('125%',{exact:true})).toBeVisible();
 for(let i=0;i<8;i++)await page.keyboard.press('Tab');
 expect(await dialog.evaluate(d=>d.contains(document.activeElement))).toBeTruthy();
 await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(trigger).toBeFocused();
 await trigger.click();await page.getByRole('button',{name:'Закрыть увеличенный график'}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.screenshot({path:'verification/labeled-bounded-plot.png',fullPage:true});expect(errors).toEqual([]);
});

test('independent Fak controls, saved scenarios and theory formulas',async({page})=>{
 await page.goto('/');await page.locator('#preset').selectOption('comparison');
 expect((await page.locator('.polynomial').allTextContents()).every(text=>!(/\bx\b/.test(text)))).toBeTruthy();await expect(page.locator('.polynomial').first()).toContainText('u(i)');
 await page.getByText('Дополнительные параметры Fak',{exact:true}).click();
 await page.getByLabel('Fak2 способ задания',{exact:true}).selectOption('constant');await page.getByLabel('Fak2 значение',{exact:true}).fill('0,8');
 await page.getByLabel('Fak4 способ задания',{exact:true}).selectOption('constant');await page.getByLabel('Fak4 значение',{exact:true}).fill('-0.2');
 const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'Сохранить сценарий'}).click();const file=await downloaded;
 const input=JSON.parse(fs.readFileSync(await file.path(),'utf8')).input;expect(input.fakOverrides).toEqual([null,.8,null,-.2,null,null]);
 await page.getByRole('button',{name:'03О модели'}).click();await expect(page.locator('.fak-formula')).toHaveCount(6);
 await expect(page.locator('.fak-formula').nth(1)).toContainText('0,8');await expect(page.getByRole('heading',{name:'Численный метод',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'01Параметры'}).click();await page.getByRole('button',{name:'Рассчитать →'}).click();await expect(page.getByText(/80 точек/)).toBeVisible();
 const fakCard=page.locator('section.card').filter({has:page.getByRole('heading',{name:'Внешние воздействия',exact:true})});
 const y=await fakCard.locator('g[data-series="1"] polyline').evaluate(line=>line.getAttribute('points').split(' ').map(p=>p.split(',')[1]));expect(new Set(y).size).toBe(1);
 await page.getByRole('button',{name:'01Параметры'}).click();await page.locator('#preset').selectOption('original');
 await page.locator('input[type=file]').setInputFiles(await file.path());await page.getByText('Дополнительные параметры Fak',{exact:true}).click();
 await expect(page.getByLabel('Fak2 значение',{exact:true})).toHaveValue('0.8');
 await page.getByLabel('Fak2 способ задания',{exact:true}).selectOption('original');await expect(page.getByLabel('Fak2 значение',{exact:true})).toHaveCount(0);
 await page.setViewportSize({width:390,height:844});
 const size=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth}));expect(size.scroll).toBeLessThanOrEqual(size.width);
});
