import * as dayjs from 'dayjs';
import 'dayjs/locale/th';
dayjs.locale('th');

export type LeadPayload = {
    leadId: string;
    registeredAt: string | Date;         // ISO หรือ Date
    customerName?: string;
    address?: string;
    phone?: string;
    timeMorning?: boolean;               // 9:00–12:00
    timeAfternoon?: boolean;             // 13:00–16:00
    detail?: string;
    linkUrl?: string;                    // https://peasolar.pea.co.th/nocodb/
    linkLabel?: string;                  // NocoDB Frontend
    area?: string;                       // ใช้ map → roomId
    roomId?: string;                     // ถ้ามีให้ยิงห้องนี้
};

const esc = (s?: string) =>
    (s ?? '').replace(/([_*`~])/g, '\\$1'); // กัน markdown พัง

export function leadMarkdown(d: LeadPayload) {
    const ts = dayjs(d.registeredAt).format('DD/MM/BBBB HH:mm[ น.]'); // พ.ศ.
    const parts: string[] = [
        `**lead alert:**`,
        `วันที่ลงทะเบียน:\n${ts}`,
        '',
    ];

    if (d.customerName) parts.push(`👤 **ชื่อลูกค้า:**\n${esc(d.customerName)}`, '');
    if (d.address) parts.push(`📍 **สถานที่ติดตั้ง:**\n${esc(d.address)}`, '');
    if (d.phone) parts.push(`📞 **เบอร์ติดต่อ:**\n${esc(d.phone)}`, '');

    const slots: string[] = [];
    if (d.timeMorning) slots.push('ช่วงเช้า (9:00 - 12:00 น.)');
    if (d.timeAfternoon) slots.push('ช่วงกลางวัน (13:00 - 16:00 น.)');
    if (slots.length) parts.push(`🕑 **เวลาที่สะดวกให้ติดต่อกลับ:**\n${slots.join(', ')}`, '');

    if (d.detail) parts.push(`📝 **รายละเอียด:**\n${esc(d.detail)}`, '');

    if (d.linkUrl) {
        const label = esc(d.linkLabel || d.linkUrl);
        parts.push(`🔗 **ดูรายละเอียดเพิ่มเติม:**\n[${label}](${d.linkUrl})`, '');
        // เผื่อ client บางตัวไม่ preview link:
        parts.push(d.linkUrl, '');
    }

    return parts.join('\n');
}
