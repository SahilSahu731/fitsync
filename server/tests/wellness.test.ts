import test from 'node:test';
import assert from 'node:assert/strict';
import { recipes, eligibleRecipes, groceries, makeMealPlan, preferencesSchema, weekOf, commitmentSchema } from '../src/modules/wellness/wellness.model.js';
test('meal plans cover seven actual dates and honor diet, preparation time and excluded ingredients',()=>{
 const prefs=preferencesSchema.parse({diet:'vegan',exclude:['soy','gluten','nuts','dairy','eggs'],maxPrepMinutes:30});
 const plan=makeMealPlan('2026-11-02',prefs);assert.equal(plan.days.length,7);assert.equal(plan.days.at(-1)?.date,'2026-11-08');
 for(const day of plan.days){assert.equal(day.meals.length,3);for(const meal of day.meals){const r=recipes.find(r=>r.id===meal.recipeId)!;assert.equal(r.diet,'vegan');assert.equal(r.contains.some(t=>prefs.exclude.includes(t)),false);assert.ok(r.minutes<=prefs.maxPrepMinutes);assert.equal(r.meal,meal.slot);}}
});
test('unavailable menus fail explicitly instead of ignoring preferences',()=>{
 assert.throws(()=>makeMealPlan('2026-11-02',{...preferencesSchema.parse({diet:'vegan'}),maxPrepMinutes:0}),/No complete menu/);
});
test('shopping lists aggregate exact ingredient units and scale every meal by servings',()=>{
 const one=makeMealPlan('2026-11-02',preferencesSchema.parse({servings:1}));const two={...one,servings:2};
 const first=groceries(one);const second=groceries(two);assert.ok(first.length>0);for(const i of first){assert.equal(second.find(j=>j.name===i.name&&j.unit===i.unit)?.amount,i.amount*2);}
});
test('preferences validate strict limits and favorites are prioritized deterministically',()=>{
 assert.equal(preferencesSchema.safeParse({servings:0}).success,false);assert.equal(preferencesSchema.safeParse({servings:7}).success,false);assert.equal(preferencesSchema.safeParse({pro:true}).success,false);
 const prefs=preferencesSchema.parse({favoriteIds:['banana-oats']});assert.equal(makeMealPlan('2026-11-02',prefs).days[0]?.meals[0]?.recipeId,'banana-oats');assert.deepEqual(makeMealPlan('2026-11-02',prefs),makeMealPlan('2026-11-02',prefs));
 assert.ok(eligibleRecipes(preferencesSchema.parse({diet:'vegetarian'})).every(r=>r.diet!=='any'));
});
test('week calculations handle year boundaries and commitments reject excessive targets or private payload injection',()=>{
 assert.equal(weekOf('2027-01-01'),'2026-12-28');assert.equal(commitmentSchema.safeParse({week:'2026-11-02',target:8,habit:'train'}).success,false);assert.equal(commitmentSchema.safeParse({week:'2026-11-02',target:3,habit:'train',partnerId:'someone'}).success,false);
});
