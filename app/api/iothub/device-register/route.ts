import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { Registry, Device } from "azure-iothub";


export async function registerDevice(deviceId: string) {
	if (!deviceId) throw new Error("deviceId is required.");

	const connectionString = process.env.IOT_CONNECTION_STRING;
	const primaryKey = process.env.IOT_PRIMARY_KEY_DEVICE;
	const secondaryKey = process.env.IOT_SECONDARY_KEY_DEVICE;
	if (!connectionString || !primaryKey || !secondaryKey) throw new Error("IOT_CONNECTION_STRING, IOT_PRIMARY_KEY_DEVICE, and IOT_SECONDARY_KEY_DEVICE environment variables are required.");
	// Registry 클라이언트 생성
	const registry = Registry.fromConnectionString(connectionString);

	const deviceInfo: Device = {
		deviceId,
		status: "enabled",
		authentication: {
			symmetricKey: {
			primaryKey: primaryKey, // 기본값 제공 (실제 환경에서는 반드시 환경변수로 설정)
			secondaryKey: secondaryKey,
			},
		},
	};
	try {
		const create_response = await registry.create(deviceInfo);
		const createdDevice = create_response.responseBody;
		if(!createdDevice) {
			throw new Error("Failed to create device: No device info returned.");
		}
		return createdDevice;
	} catch (error: any) {
		if (error?.statusCode === 409 || error?.code === 'DeviceAlreadyExistsError') {
			const get_response = await registry.get(deviceId);
			const existingDevice = get_response.responseBody;
			if(!existingDevice) {
				throw new Error("Failed to retrieve existing device after DeviceAlreadyExistsError.");
			}
			return existingDevice;
		} else {
			throw error;
		}
	}
}


export async function POST(request: NextRequest) {
	
	const session = await requireAdmin();
	if (!session) {
		return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
	} 

	const body = await request.json().catch(() => ({} as { number_of_devices?: number | string }));
	const numberOfDevicesRaw = body.number_of_devices ?? request.nextUrl.searchParams.get('number_of_devices');
	const numberOfDevices = Number.parseInt(String(numberOfDevicesRaw ?? ''), 10);
	if (isNaN(numberOfDevices) || numberOfDevices <= 0 || numberOfDevices > 1000) {
		return NextResponse.json(
			{ error: 'Invalid number of devices. Must be between 1 and 1000' },
			{ status: 400 }
		);
    }
    try {
		const data = Array.from({ length: numberOfDevices }, (_, i) => {
      		const n = String(i + 1).padStart(4, "0"); // 0001~0010
			return {
				deviceId: `simdevice${n}`
			};
		});

		const createdDevices = [];
		for (let i = 0; i < numberOfDevices; i++) {
			const deviceId = data[i].deviceId;
			const createdDevice = await registerDevice(deviceId);
			createdDevices.push(createdDevice);
		}
		const createdCount = createdDevices.length;

    return NextResponse.json({
		message: 'Device successfully created.',
		count: createdCount,
    }, { status: 200 });
	} catch (error) {
		console.error("Device registration error:", error)
		return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to register device" }, { status: 500 })
	}
}
