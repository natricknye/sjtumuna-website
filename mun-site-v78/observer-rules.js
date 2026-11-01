/* Organizer-supplied observer regulations. Keep all clauses together. */
window.renderObserverRules=function(zh){
 const title=zh?'2026年上海交通大学南洋模拟联合国大会观察员管理条例':'Observer Regulations — 2026 SJTU Nanyang Model United Nations Conference';
 const sections=zh?[
 ['一、观察员资格',[
 '本届大会设立少量观察员席位，供对模拟联合国活动、大会议题或委员会运作感兴趣，但不以正式代表身份参会的人员申请。',
 '观察员原则上应为在校高中生、本科生、研究生或其他经大会组委会认可的人员。',
 '观察员席位实行申请制，具体名额由秘书处根据会场容量、校园管理及各委员会实际情况确定。大会不保证所有申请均能获得观察资格。',
 '未满18周岁的观察员须以学校、社团等团体形式报名，并由所在团体安排至少一名年满18周岁的成年人全程陪同，不接受未成年观察员个人独立报名。']],
 ['二、观察范围',[
 '观察员经组委会确认后，可进入指定委员会旁听正式会议。',
 '观察员原则上应按照报名时确定的委员会进行旁听。如确需更换会场，应提前征得大会秘书处或相关工作人员同意。',
 '因会场容量、会议形式或特殊议程需要，主席团及秘书处有权临时限制或暂停观察员进入部分会议环节。',
 '部分涉及特殊安排、内部工作或不宜开放旁听的环节，不向观察员开放，具体以大会现场通知为准。']],
 ['三、观察员权利与义务',[
 '观察员可以旁听委员会正式会议，了解委员会议事流程、议题讨论及代表磋商情况。',
 '观察员不具有正式代表身份，不享有发言权、动议权、表决权及文件署名权，不参与大会奖项评选。',
 '未经主席团许可，观察员不得在会议进行过程中与代表进行讨论、传递信息或以其他方式影响委员会正常议程。',
 '观察员进入会场后，应服从主席团及组委会工作人员安排，保持会场秩序，不得随意走动、大声交谈或从事其他影响会议进行的行为。',
 '未经许可，不得对大会学术文件、会场内容及参会人员进行录音、录像或直播。摄影应遵守大会统一安排。',
 '观察员不得以观察身份获取或传播大会明确要求保密的资料与信息。',
 '对严重扰乱会议秩序、不服从工作人员管理或违反大会相关规定者，秘书处有权取消其观察资格并要求其离场，相关费用原则上不予退还。']],
 ['四、报名与确认',[
 '观察员采取提前报名制，原则上不接受未经登记的人员直接进入会场旁听。',
 '申请者须向大会组委会提交姓名、学校、联系方式、拟旁听委员会及其他必要信息。',
 '观察员名额按照会场实际容量进行控制。申请人数超过可容纳人数时，由秘书处根据报名时间及大会实际情况统一协调。',
 '申请获批并完成缴费后，视为观察席位确认成功。观察员须凭组委会规定的证件或凭证进入会场。']]
 ]:[
 ['I. Eligibility',[
 'A limited number of observer places are available to those interested in Model United Nations, the conference topics or committee proceedings who do not attend as official delegates.',
 'Observers should generally be current high-school, undergraduate or postgraduate students, or other persons approved by the Organizing Committee.',
 'Observer places require an application. The Secretariat determines the quota according to room capacity, campus management requirements and each committee’s circumstances. Not every application is guaranteed approval.',
 'Observers under 18 must apply as part of a school, club or other group. The group must arrange at least one adult aged 18 or above to accompany them throughout the conference. Independent applications from observers under 18 are not accepted.']],
 ['II. Scope of Observation',[
 'After confirmation by the Organizing Committee, observers may attend formal sessions of their designated committee.',
 'Observers should generally remain with the committee selected at registration. Any change requires prior permission from the Secretariat or the relevant staff.',
 'The dais and Secretariat may temporarily restrict or suspend observer access to certain sessions because of room capacity, meeting format or special agenda requirements.',
 'Sessions involving special arrangements, internal work or matters unsuitable for observation are closed to observers. On-site conference announcements prevail.']],
 ['III. Rights and Responsibilities',[
 'Observers may attend formal committee sessions to learn about procedures, topic discussions and delegate negotiations.',
 'Observers are not official delegates. They have no speaking, motion, voting or document-signing rights and are not eligible for conference awards.',
 'Without permission from the dais, observers must not discuss with delegates, pass information or otherwise affect normal proceedings during sessions.',
 'Observers must follow the instructions of the dais and organizing staff, maintain order, and refrain from unnecessary movement, loud conversation or other disruptive conduct.',
 'Without permission, observers must not make audio or video recordings or livestream conference documents, proceedings or participants. Photography must follow the conference’s arrangements.',
 'Observers must not use their status to obtain or share materials or information that the conference expressly requires to remain confidential.',
 'The Secretariat may revoke observer status and require anyone who seriously disrupts proceedings, refuses staff instructions or violates conference rules to leave. Related fees are in principle non-refundable.']],
 ['IV. Registration and Confirmation',[
 'Observers must register in advance. Unregistered persons are generally not admitted directly to observe sessions.',
 'Applicants must provide their name, school, contact details, intended committee and other necessary information to the Organizing Committee.',
 'Observer numbers are limited by actual room capacity. If applications exceed capacity, the Secretariat coordinates places according to registration time and conference circumstances.',
 'A place is confirmed once the application is approved and payment is completed. Observers must present the identification or pass required by the Organizing Committee to enter.']]
 ];
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 return `<p class="observer-rules-title">${esc(title)}</p>`+sections.map(([heading,clauses])=>`<section class="observer-rule-section"><h4>${esc(heading)}</h4><ol>${clauses.map(t=>`<li>${esc(t)}</li>`).join('')}</ol></section>`).join('')+`<section class="observer-rule-section"><h4>${zh?'五、观察员费用':'V. Observer Fee'}</h4><p>${zh?'采用以下标准：':'The fee is as follows:'}</p><p class="observer-fee">${zh?'全程观察员：120元/人':'Full-conference observer: RMB 120 per person'}</p><p>${zh?'观察员费用主要用于会务组织、证件制作、基础物料及现场管理等支出，不包含交通、住宿及餐饮费用。':'The observer fee primarily covers conference organization, pass production, basic materials and on-site management. Travel, accommodation and meals are not included.'}</p></section>`;
};
